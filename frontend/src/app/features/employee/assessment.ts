import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../core/auth/auth.service';
import { DataService } from '../../core/data/data.service';
import {
  Certificate,
  EvaluationTask,
  FORMAT_LABELS,
  ModuleFormat,
  TrainingDecision,
} from '../../core/models';
import { PageHeader } from '../../shared/ui/page-header';

type Phase = 'CHOOSE' | 'RUN' | 'RESULT';

interface TaskFeedback {
  task: EvaluationTask;
  score: number;
  ratio: number;
  comment: string;
}

/**
 * Évaluation finale (CDC §5.X.2).
 *
 * L'employé choisit **un seul** des sept formats de formation. L'IA génère
 * alors une évaluation dérivée du parcours réellement terminé, puis l'employé
 * réalise les activités propres à ce format. Le seuil de réussite reste 75/100.
 */
@Component({
  selector: 'wa-employee-assessment',
  imports: [DatePipe, RouterLink, MatButtonModule, MatProgressBarModule, PageHeader],
  templateUrl: './assessment.html',
  styleUrl: './assessment.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmployeeAssessment {
  private readonly data = inject(DataService);
  private readonly auth = inject(AuthService);
  private readonly snack = inject(MatSnackBar);

  readonly formats = this.data.formats;
  readonly formatLabels = FORMAT_LABELS;
  readonly activeCourse = this.data.activeCourse;

  readonly phase = signal<Phase>('CHOOSE');
  readonly selectedFormat = signal<ModuleFormat | null>(null);
  readonly evaluation = this.data.generatedEvaluation;

  readonly quizAnswers = signal<Record<string, number>>({});
  readonly decisions = signal<Record<string, number>>({});
  readonly drafts = signal<Record<string, string>>({});
  readonly studyChecks = signal<Record<string, boolean>>({});
  readonly reviewChecks = signal<Record<string, string[]>>({});
  readonly codeChecked = signal<Record<string, boolean>>({});
  readonly submittedTasks = signal<Record<string, boolean>>({});

  readonly result = signal<Certificate | null>(null);
  readonly finalScore = signal(0);

  readonly tasks = computed(() => this.evaluation()?.tasks ?? []);
  readonly totalPoints = computed(() =>
    this.tasks().reduce((sum, task) => sum + task.points, 0),
  );
  readonly passScore = computed(() => this.evaluation()?.passScore ?? 75);
  readonly isPassed = computed(() => this.finalScore() >= this.passScore());

  readonly taskFeedback = computed<TaskFeedback[]>(() => {
    const evaluation = this.evaluation();
    if (!evaluation) {
      return [];
    }
    return evaluation.tasks.map((task) => {
      const ratio = this.taskRatio(task);
      return {
        task,
        ratio,
        score: Math.round(task.points * ratio),
        comment: this.commentFor(task, ratio),
      };
    });
  });

  readonly readyCount = computed(
    () => this.tasks().filter((task) => this.isTaskReady(task)).length,
  );

  readonly canFinish = computed(
    () => this.tasks().length > 0 && this.readyCount() === this.tasks().length,
  );

  readonly progress = computed(() => {
    const total = this.tasks().length;
    return total === 0 ? 0 : Math.round((this.readyCount() / total) * 100);
  });

  readonly formatLabel = computed(() => {
    const code = this.selectedFormat();
    return code ? FORMAT_LABELS[code] : '';
  });

  readonly recommendations = computed(() => {
    const feedback = [...this.taskFeedback()].sort((a, b) => a.ratio - b.ratio);
    const weakest = feedback[0];
    const items: { icon: string; title: string; text: string; link: string; action: string }[] = [];

    if (!this.isPassed()) {
      items.push({
        icon: 'refresh',
        title: 'Reprendre la formation',
        text: 'Le seuil de 75 / 100 n’est pas atteint. Reprenez les activités du parcours avant de retenter l’évaluation.',
        link: '/app/parcours',
        action: 'Revoir mon parcours',
      });
    }

    if (weakest) {
      items.push({
        icon: 'target',
        title: 'Consolider en priorité',
        text: `L’activité « ${weakest.task.title} » est la moins réussie. Un format complémentaire peut aider à consolider ce point.`,
        link: '/app/formations',
        action: 'Choisir une formation',
      });
    }

    items.push({
      icon: 'category',
      title: 'Retenter dans un autre format',
      text: 'L’évaluation peut être repassée dans l’un des sept formats. Le contenu est régénéré à partir du même parcours.',
      link: '/app/formations',
      action: 'Explorer les formats',
    });

    items.push({
      icon: 'verified_user',
      title: 'Validation humaine',
      text: 'Toute décision de formation reste validée par votre superviseur. Aucun résultat n’est utilisé de façon disciplinaire.',
      link: '/app/competences',
      action: 'Voir mes compétences',
    });

    return items;
  });

  /** Étape 1 : l'employé choisit un format et l'IA génère l'évaluation. */
  chooseFormat(format: ModuleFormat): void {
    this.selectedFormat.set(format);
    this.data.prepareEvaluation(format);
    this.resetState();
    this.phase.set('RUN');
    this.snack.open(
      `Évaluation ${FORMAT_LABELS[format].toLowerCase()} générée à partir de votre parcours.`,
      'Fermer',
      { duration: 5000 },
    );
  }

  changeFormat(): void {
    this.phase.set('CHOOSE');
    this.resetState();
  }

  private resetState(): void {
    this.quizAnswers.set({});
    this.decisions.set({});
    this.drafts.set({});
    this.studyChecks.set({});
    this.reviewChecks.set({});
    this.codeChecked.set({});
    this.submittedTasks.set({});
    this.result.set(null);
    this.finalScore.set(0);
  }

  // ---------- Quiz ----------
  answer(questionId: string, optionIndex: number): void {
    this.quizAnswers.update((state) => ({ ...state, [questionId]: optionIndex }));
  }

  // ---------- Décisions ----------
  chooseDecision(task: EvaluationTask, decisionIndex: number, optionIndex: number): void {
    const key = `${task.id}-${decisionIndex}`;
    this.decisions.update((state) => ({ ...state, [key]: optionIndex }));
  }

  decisionChoice(task: EvaluationTask, decisionIndex: number): number | undefined {
    return this.decisions()[`${task.id}-${decisionIndex}`];
  }

  decisionOutcome(task: EvaluationTask, decisionIndex: number): string | null {
    const decision = task.decisions?.[decisionIndex];
    const choice = this.decisionChoice(task, decisionIndex);
    return decision && choice !== undefined ? decision.options[choice]?.outcome ?? null : null;
  }

  decisionCorrect(task: EvaluationTask, decisionIndex: number): boolean {
    const decision = task.decisions?.[decisionIndex];
    const choice = this.decisionChoice(task, decisionIndex);
    return !!decision && choice !== undefined && (decision.options[choice]?.correct ?? false);
  }

  // ---------- Textes et cases ----------
  draft(task: EvaluationTask): string {
    return this.drafts()[task.id] ?? '';
  }

  setDraft(task: EvaluationTask, value: string): void {
    this.drafts.update((state) => ({ ...state, [task.id]: value }));
  }

  toggleStudy(task: EvaluationTask): void {
    this.studyChecks.update((state) => ({ ...state, [task.id]: !state[task.id] }));
  }

  toggleCriterion(task: EvaluationTask, criterion: string): void {
    this.reviewChecks.update((state) => {
      const current = state[task.id] ?? [];
      const next = current.includes(criterion)
        ? current.filter((item) => item !== criterion)
        : [...current, criterion];
      return { ...state, [task.id]: next };
    });
  }

  criterionChecked(task: EvaluationTask, criterion: string): boolean {
    return (this.reviewChecks()[task.id] ?? []).includes(criterion);
  }

  verifyCode(task: EvaluationTask): void {
    this.codeChecked.update((state) => ({ ...state, [task.id]: true }));
    this.submittedTasks.update((state) => ({ ...state, [task.id]: true }));
    this.snack.open('Exercice vérifié. Les critères automatiques sont pris en compte.', 'Fermer', {
      duration: 4000,
    });
  }

  submitTask(task: EvaluationTask): void {
    this.submittedTasks.update((state) => ({ ...state, [task.id]: true }));
  }

  // ---------- Évaluation des activités ----------
  isTaskReady(task: EvaluationTask): boolean {
    switch (task.kind) {
      case 'STUDY':
        return !!this.studyChecks()[task.id];
      case 'QUIZ':
        return (task.quiz?.questions ?? []).every(
          (question) => this.quizAnswers()[question.id] !== undefined,
        );
      case 'CODE':
        return !!this.codeChecked()[task.id];
      case 'PROJECT':
        return this.draft(task).trim().length >= 80;
      case 'CHAT':
        return this.draft(task).trim().length >= 120;
      case 'DECISION':
        return (task.decisions ?? []).every(
          (_decision, index) => this.decisionChoice(task, index) !== undefined,
        );
      case 'REVIEW':
        return this.draft(task).trim().length >= 60 && (this.reviewChecks()[task.id]?.length ?? 0) >= 2;
      default:
        return false;
    }
  }

  taskRatio(task: EvaluationTask): number {
    switch (task.kind) {
      case 'STUDY':
        return this.studyChecks()[task.id] ? 1 : 0;
      case 'QUIZ': {
        const questions = task.quiz?.questions ?? [];
        if (!questions.length) {
          return 0;
        }
        const correct = questions.filter(
          (question) => this.quizAnswers()[question.id] === question.correctIndex,
        ).length;
        return correct / questions.length;
      }
      case 'CODE': {
        const draft = this.draft(task).toLowerCase();
        const expected = task.exercise?.expected ?? [];
        if (!this.codeChecked()[task.id]) {
          return 0;
        }
        if (!expected.length) {
          return draft.trim().length >= 30 ? 1 : 0;
        }
        const matched = expected.filter((keyword) => draft.includes(keyword.toLowerCase())).length;
        return matched / expected.length;
      }
      case 'PROJECT':
        return Math.min(1, this.draft(task).trim().length / 120);
      case 'CHAT': {
        const text = this.draft(task).toLowerCase();
        const keywords = task.expectedKeywords ?? [];
        if (text.trim().length < 120) {
          return Math.min(0.6, text.trim().length / 120);
        }
        if (!keywords.length) {
          return 1;
        }
        const hits = keywords.filter((keyword) => text.includes(keyword.toLowerCase())).length;
        return 0.6 + 0.4 * (hits / keywords.length);
      }
      case 'DECISION': {
        const decisions = task.decisions ?? [];
        if (!decisions.length) {
          return 0;
        }
        const correct = decisions.filter((_decision, index) =>
          this.decisionCorrect(task, index),
        ).length;
        return correct / decisions.length;
      }
      case 'REVIEW': {
        const criteria = task.reviewCriteria ?? [];
        const checked = this.reviewChecks()[task.id]?.length ?? 0;
        const criteriaRatio = criteria.length ? Math.min(1, checked / criteria.length) : 1;
        const draftRatio = Math.min(1, this.draft(task).trim().length / 80);
        return criteriaRatio * 0.6 + draftRatio * 0.4;
      }
      default:
        return 0;
    }
  }

  private commentFor(task: EvaluationTask, ratio: number): string {
    if (ratio >= 0.9) {
      return 'Maîtrise solide : les critères sont satisfaits.';
    }
    if (ratio >= 0.7) {
      return 'Acquis globalement atteints, avec une marge de progression.';
    }
    if (ratio >= 0.4) {
      return 'Partiellement réussi : certains critères restent à consolider.';
    }
    return 'À retravailler : l’activité ne démontre pas encore la compétence visée.';
  }

  quizScore(task: EvaluationTask): number {
    return Math.round(this.taskRatio(task) * 100);
  }

  isCorrect(questionId: string, optionIndex: number, task: EvaluationTask): boolean {
    const question = task.quiz?.questions.find((item) => item.id === questionId);
    return question?.correctIndex === optionIndex;
  }

  letter(index: number): string {
    return String.fromCharCode(65 + index);
  }

  // ---------- Clôture ----------
  finish(): void {
    if (!this.canFinish()) {
      return;
    }
    const evaluation = this.evaluation();
    const format = this.selectedFormat();
    const user = this.auth.user();
    if (!evaluation || !format || !user) {
      return;
    }

    const totalPoints = this.tasks().reduce((sum, task) => sum + task.points, 0);
    const earned = this.tasks().reduce(
      (sum, task) => sum + task.points * this.taskRatio(task),
      0,
    );
    const score = totalPoints === 0 ? 0 : Math.round((earned / totalPoints) * 100);
    this.finalScore.set(score);

    const criteria = this.tasks().map(
      (task) =>
        `${task.title} : ${Math.round(this.taskRatio(task) * 100)} % (${Math.round(task.points * this.taskRatio(task))} / ${task.points})`,
    );

    const certificate = this.data.completeEvaluation({
      score,
      format,
      employeeId: user.id,
      employeeName: user.name,
      criteria,
    });
    this.result.set(certificate);
    this.phase.set('RESULT');

    this.snack.open(
      score >= this.passScore()
        ? `Évaluation réussie : ${score} / 100. Certificat interne délivré.`
        : `Score ${score} / 100 — seuil de ${this.passScore()} non atteint. Un parcours de consolidation est proposé.`,
      'Fermer',
      { duration: 6500 },
    );
  }

  restart(): void {
    this.changeFormat();
  }

  formatIcon(code: ModuleFormat): string {
    return this.formats().find((format) => format.code === code)?.icon ?? 'school';
  }

  /** Libellé du type d'activité pour l'interface. */
  taskKindLabel(task: EvaluationTask): string {
    switch (task.kind) {
      case 'STUDY':
        return 'Analyse de ressources';
      case 'QUIZ':
        return 'Questionnaire';
      case 'CODE':
        return 'Exercice technique';
      case 'PROJECT':
        return 'Livrable de projet';
      case 'DECISION':
        return 'Mise en situation';
      case 'CHAT':
        return 'Entretien avec le tuteur IA';
      case 'REVIEW':
        return 'Revue de pair';
      default:
        return task.kind;
    }
  }

  decisionLabel(decision: TrainingDecision, index: number): string {
    return decision.options[index]?.label ?? '';
  }

  evaluationCourse(): string {
    return this.evaluation()?.courseTitle ?? this.activeCourse()?.title ?? 'Parcours';
  }
}
