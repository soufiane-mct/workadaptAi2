import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { DataService } from '../../core/data/data.service';
import { FORMAT_LABELS, TrainingStep } from '../../core/models';
import { PageHeader } from '../../shared/ui/page-header';

interface CodeCheck {
  passed: boolean;
  matched: string[];
  missing: string[];
}

interface ChatLine {
  author: 'AI' | 'USER';
  text: string;
}

@Component({
  selector: 'wa-training-session',
  imports: [RouterLink, MatButtonModule, MatProgressBarModule, PageHeader],
  templateUrl: './training-session.html',
  styleUrl: './training-session.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrainingSession {
  private readonly data = inject(DataService);
  private readonly route = inject(ActivatedRoute);
  private readonly snack = inject(MatSnackBar);

  private readonly requestId = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('requestId') ?? '')),
    { initialValue: '' },
  );

  readonly request = computed(
    () => this.data.trainingRequests().find((item) => item.id === this.requestId()) ?? null,
  );

  readonly training = computed(() => this.data.trainingFor(this.requestId()));

  readonly formatLabels = FORMAT_LABELS;
  readonly activeCourse = this.data.activeCourse;

  readonly stepIndex = signal(0);
  readonly finished = signal(false);

  readonly videoProgress = signal<Record<string, number>>({});
  readonly articleRead = signal<Record<string, boolean>>({});
  readonly podcastPlayed = signal<Record<string, boolean>>({});

  readonly flipped = signal<Record<string, boolean>>({});
  readonly viewedCards = signal<number[]>([]);
  readonly cardIndex = signal(0);

  readonly quizAnswers = signal<Record<string, number>>({});
  readonly quizSubmitted = signal<Record<string, boolean>>({});

  readonly codeDrafts = signal<Record<string, string>>({});
  readonly codeResults = signal<Record<string, CodeCheck>>({});
  readonly hintsShown = signal<Record<string, number>>({});

  readonly projectDrafts = signal<Record<string, string>>({});
  readonly projectChecked = signal<Record<string, boolean>>({});

  readonly decisions = signal<Record<string, number>>({});

  readonly chats = signal<Record<string, ChatLine[]>>({});
  readonly chatDrafts = signal<Record<string, string>>({});

  readonly peerRole = signal('');
  readonly peerTasks = signal<Record<string, boolean>>({});
  readonly peerReview = signal<Record<string, string>>({});
  readonly peerChecked = signal<Record<string, boolean>>({});

  readonly steps = computed(() => this.training()?.steps ?? []);
  readonly currentStep = computed(() => this.steps()[this.stepIndex()] ?? null);

  readonly progress = computed(() => {
    const steps = this.steps().filter((step) => step.required);
    if (!steps.length) {
      return 0;
    }
    return Math.round((steps.filter((step) => this.isStepComplete(step)).length / steps.length) * 100);
  });

  readonly canFinish = computed(
    () => this.progress() === 100 && !this.finished() && this.request()?.status !== 'COMPLETED',
  );

  readonly canAccess = computed(() => {
    const status = this.request()?.status;
    return status === 'APPROVED' || status === 'IN_PROGRESS' || status === 'COMPLETED';
  });

  // ---------- Navigation entre étapes ----------
  goToStep(index: number): void {
    this.stepIndex.set(index);
  }

  next(): void {
    this.stepIndex.update((index) => Math.min(this.steps().length - 1, index + 1));
  }

  previous(): void {
    this.stepIndex.update((index) => Math.max(0, index - 1));
  }

  // ---------- Vidéo / article / podcast ----------
  watchChapter(step: TrainingStep, increment = 25): void {
    const value = Math.min(100, (this.videoProgress()[step.id] ?? 0) + increment);
    this.videoProgress.update((state) => ({ ...state, [step.id]: value }));
  }

  markRead(step: TrainingStep): void {
    this.articleRead.update((state) => ({ ...state, [step.id]: !state[step.id] }));
  }

  markPlayed(step: TrainingStep): void {
    this.podcastPlayed.update((state) => ({ ...state, [step.id]: !state[step.id] }));
  }

  // ---------- Cartes ----------
  flipCard(step: TrainingStep, index: number): void {
    const key = `${step.id}-${index}`;
    this.flipped.update((state) => ({ ...state, [key]: !state[key] }));
    this.viewedCards.update((cards) => (cards.includes(index) ? cards : [...cards, index]));
  }

  setCard(index: number): void {
    this.cardIndex.set(index);
  }

  // ---------- Quiz ----------
  answer(questionId: string, optionIndex: number): void {
    this.quizAnswers.update((state) => ({ ...state, [questionId]: optionIndex }));
  }

  submitQuiz(step: TrainingStep): void {
    this.quizSubmitted.update((state) => ({ ...state, [step.id]: true }));
    this.snack.open(
      `Contrôle soumis : ${this.quizScore(step)} % de bonnes réponses.`,
      'Fermer',
      { duration: 4000 },
    );
  }

  quizScore(step: TrainingStep): number {
    const questions = step.quiz?.questions ?? [];
    if (!questions.length) {
      return 0;
    }
    const answers = this.quizAnswers();
    const correct = questions.filter((question) => answers[question.id] === question.correctIndex).length;
    return Math.round((correct / questions.length) * 100);
  }

  isCorrect(questionId: string, optionIndex: number): boolean {
    for (const step of this.steps()) {
      const question = step.quiz?.questions.find((item) => item.id === questionId);
      if (question) {
        return question.correctIndex === optionIndex;
      }
    }
    return false;
  }

  letter(index: number): string {
    return String.fromCharCode(65 + index);
  }

  // ---------- Exercice technique ----------
  codeDraft(step: TrainingStep): string {
    return this.codeDrafts()[step.id] ?? step.exercise?.starter ?? '';
  }

  setCode(step: TrainingStep, value: string): void {
    this.codeDrafts.update((state) => ({ ...state, [step.id]: value }));
  }

  verifyCode(step: TrainingStep): void {
    const draft = this.codeDraft(step).toLowerCase();
    const expected = step.exercise?.expected ?? [];
    const matched = expected.filter((keyword) => draft.includes(keyword.toLowerCase()));
    const missing = expected.filter((keyword) => !draft.includes(keyword.toLowerCase()));
    const passed = missing.length === 0 && draft.trim().length >= 30;
    this.codeResults.update((state) => ({ ...state, [step.id]: { passed, matched, missing } }));
    this.snack.open(
      passed
        ? 'Vérification réussie : les critères automatiques sont satisfaits.'
        : 'Vérification incomplète : complétez les éléments manquants.',
      'Fermer',
      { duration: 4500 },
    );
  }

  showHint(step: TrainingStep): void {
    const current = this.hintsShown()[step.id] ?? 0;
    const max = step.exercise?.hints.length ?? 0;
    if (current < max) {
      this.hintsShown.update((state) => ({ ...state, [step.id]: current + 1 }));
    }
  }

  useSolution(step: TrainingStep): void {
    this.setCode(step, step.exercise?.solution ?? '');
  }

  // ---------- Projet ----------
  projectDraft(step: TrainingStep): string {
    return this.projectDrafts()[step.id] ?? '';
  }

  setProject(step: TrainingStep, value: string): void {
    this.projectDrafts.update((state) => ({ ...state, [step.id]: value }));
  }

  checkProject(step: TrainingStep): void {
    const valid = this.projectDraft(step).trim().length >= 40;
    this.projectChecked.update((state) => ({ ...state, [step.id]: valid }));
    this.snack.open(
      valid
        ? 'Livrable enregistré pour cette étape.'
        : 'Décrivez votre livrable en 40 caractères minimum.',
      'Fermer',
      { duration: 4200 },
    );
  }

  // ---------- Simulation ----------
  chooseDecision(step: TrainingStep, decisionIndex: number, optionIndex: number): void {
    const key = `${step.id}-${decisionIndex}`;
    this.decisions.update((state) => ({ ...state, [key]: optionIndex }));
  }

  decisionChoice(step: TrainingStep, decisionIndex: number): number | undefined {
    return this.decisions()[`${step.id}-${decisionIndex}`];
  }

  decisionOutcome(step: TrainingStep, decisionIndex: number): string | null {
    const decision = step.decisions?.[decisionIndex];
    const choice = this.decisionChoice(step, decisionIndex);
    if (!decision || choice === undefined) {
      return null;
    }
    return decision.options[choice]?.outcome ?? null;
  }

  decisionCorrect(step: TrainingStep, decisionIndex: number): boolean {
    const decision = step.decisions?.[decisionIndex];
    const choice = this.decisionChoice(step, decisionIndex);
    if (!decision || choice === undefined) {
      return false;
    }
    return decision.options[choice]?.correct ?? false;
  }

  // ---------- Tuteur IA ----------
  chatMessages(step: TrainingStep): ChatLine[] {
    const existing = this.chats()[step.id];
    if (existing) {
      return existing;
    }
    return step.body.map((text) => ({ author: 'AI' as const, text }));
  }

  chatDraft(step: TrainingStep): string {
    return this.chatDrafts()[step.id] ?? '';
  }

  setChatDraft(step: TrainingStep, value: string): void {
    this.chatDrafts.update((state) => ({ ...state, [step.id]: value }));
  }

  sendChat(step: TrainingStep): void {
    const draft = this.chatDraft(step).trim();
    if (draft.length < 3) {
      return;
    }
    const history = [...this.chatMessages(step), { author: 'USER' as const, text: draft }];
    history.push({ author: 'AI', text: this.tutorReply(draft) });
    this.chats.update((state) => ({ ...state, [step.id]: history }));
    this.chatDrafts.update((state) => ({ ...state, [step.id]: '' }));
  }

  private tutorReply(message: string): string {
    const value = message.toLowerCase();
    if (value.includes('exemple')) {
      return "Prenons un exemple concret : partez d’une situation réelle de votre poste, décrivez le résultat attendu, puis décomposez l’action en trois étapes vérifiables. Je vous propose de le faire maintenant dans l’exercice final.";
    }
    if (value.includes('pourquoi')) {
      return "Parce que la maîtrise se prouve par une réalisation observable. Comprendre le « pourquoi » vous permet de transposer la solution à un cas différent, au lieu de répéter une commande.";
    }
    if (value.includes('erreur') || value.includes('bloqu')) {
      return "Décrivez le symptôme exact, ce que vous avez déjà essayé et le résultat obtenu. Nous allons isoler une hypothèse à la fois, puis vérifier le comportement avant de modifier autre chose.";
    }
    return "Bonne question. Reliez-la à une situation réelle de votre poste : quel résultat voulez-vous obtenir, et comment saurez-vous que c’est réussi ? Je vous aiderai à transformer cela en exercice mesurable.";
  }

  userMessageCount(step: TrainingStep): number {
    return this.chatMessages(step).filter((line) => line.author === 'USER').length;
  }

  // ---------- Collaboratif ----------
  chooseRole(role: string): void {
    this.peerRole.set(role);
  }

  togglePeerTask(task: string): void {
    this.peerTasks.update((state) => ({ ...state, [task]: !state[task] }));
  }

  peerReviewDraft(step: TrainingStep): string {
    return this.peerReview()[step.id] ?? '';
  }

  setPeerReview(step: TrainingStep, value: string): void {
    this.peerReview.update((state) => ({ ...state, [step.id]: value }));
  }

  checkPeer(step: TrainingStep): void {
    const valid =
      !!this.peerRole() &&
      Object.values(this.peerTasks()).filter(Boolean).length >= 2 &&
      this.peerReviewDraft(step).trim().length >= 40;
    this.peerChecked.update((state) => ({ ...state, [step.id]: valid }));
    this.snack.open(
      valid
        ? 'Contribution et revue enregistrées. L’équipe peut poursuivre.'
        : 'Choisissez un rôle, cochez deux tâches et rédigez une revue de 40 caractères minimum.',
      'Fermer',
      { duration: 4600 },
    );
  }

  // ---------- Complétion ----------
  isStepComplete(step: TrainingStep): boolean {
    switch (step.kind) {
      case 'VIDEO':
        return (this.videoProgress()[step.id] ?? 0) >= 100;
      case 'ARTICLE':
        return !!this.articleRead()[step.id];
      case 'PODCAST':
        return !!this.podcastPlayed()[step.id];
      case 'FLASHCARD':
        return this.viewedCards().length >= (this.training()?.flashcards?.length ?? 0);
      case 'QUIZ':
        return !!this.quizSubmitted()[step.id];
      case 'CODE':
        return !!this.codeResults()[step.id]?.passed;
      case 'PROJECT':
        return !!this.projectChecked()[step.id];
      case 'DECISION':
        return (step.decisions ?? []).every(
          (_decision, index) => this.decisionChoice(step, index) !== undefined,
        );
      case 'CHAT':
        return this.userMessageCount(step) >= 2;
      case 'PEER':
        return !!this.peerChecked()[step.id];
      default:
        return false;
    }
  }

  stepState(step: TrainingStep): string {
    return this.isStepComplete(step) ? 'Terminée' : 'À faire';
  }

  finish(): void {
    if (!this.canFinish()) {
      return;
    }
    this.finished.set(true);
    this.data.completeTraining(this.requestId());
    this.snack.open(
      'Formation terminée. L’évaluation finale est maintenant disponible dans votre parcours.',
      'Fermer',
      { duration: 6000 },
    );
  }
}
