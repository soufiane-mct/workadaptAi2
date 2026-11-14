import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { AuthService } from '../../core/auth/auth.service';
import { DataService } from '../../core/data/data.service';
import { InterviewAction, InterviewMessage } from '../../core/models';
import { PageHeader } from '../../shared/ui/page-header';

type Phase = 'CV' | 'CONVERSATION' | 'QUIZ' | 'SCENARIO' | 'SYNTHESIS';

interface Question {
  text: string;
  topic: string;
}

interface DiagnosticQuestion {
  id: string;
  topic: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  strength: string;
  watchpoint: string;
}

const QUESTIONS: Question[] = [
  {
    topic: 'Docker',
    text: 'Vous utilisez Docker régulièrement. Sur quels aspects vous sentez-vous le moins à l’aise : écrire un Dockerfile, gérer les volumes, ou diagnostiquer un conteneur qui ne démarre pas ?',
  },
  {
    topic: 'CI/CD',
    text: 'Avez-vous déjà mis en place un pipeline d’intégration continue, ou seulement utilisé un pipeline existant ?',
  },
  {
    topic: 'Objectifs',
    text: 'Quel objectif professionnel aimeriez-vous atteindre dans les six prochains mois ?',
  },
  {
    topic: 'Difficultés',
    text: 'Quelle difficulté rencontrez-vous le plus souvent dans votre travail actuel ?',
  },
];

const ANSWERS = [
  'Merci. J’enregistre votre réponse et j’ajuste l’estimation : cela confirme un niveau intermédiaire en pratique, avec un besoin de consolidation sur le diagnostic.',
  'Noté. Ces informations complètent les données observées sur le poste. Elles restent marquées comme « déclarées » dans votre profil.',
  'Très bien. Votre objectif sera pris en compte par l’Agent Learning Planner pour prioriser les parcours.',
];

const DIAGNOSTIC_QUIZ: DiagnosticQuestion[] = [
  {
    id: 'dq-1',
    topic: 'Docker',
    prompt: 'Quel est le principal bénéfice d’un Dockerfile multi-étapes ?',
    options: [
      'Réduire la taille de l’image finale en séparant compilation et exécution',
      'Supprimer le besoin de tests automatisés',
      'Rendre le conteneur obligatoirement plus rapide',
      'Éviter d’écrire un fichier .dockerignore',
    ],
    correctIndex: 0,
    explanation:
      'Le multi-étapes ne conserve dans l’image finale que les artefacts nécessaires à l’exécution.',
    strength: 'Construction d’images Docker reproductibles',
    watchpoint: 'Maîtrise des builds multi-étapes et de la taille des images',
  },
  {
    id: 'dq-2',
    topic: 'CI/CD',
    prompt: 'Où doivent vivre les secrets utilisés par un pipeline GitHub Actions ?',
    options: [
      'Dans le coffre du fournisseur, référencés par variables',
      'En clair dans le fichier YAML du workflow',
      'Dans un commentaire du dernier commit',
      'Dans le nom de la branche',
    ],
    correctIndex: 0,
    explanation:
      'Un secret doit être fourni par le coffre et référencé par variable, jamais écrit dans le dépôt.',
    strength: 'Sécurisation des secrets de pipeline',
    watchpoint: 'Gestion des secrets et des environnements CI/CD',
  },
  {
    id: 'dq-3',
    topic: 'Kubernetes',
    prompt: 'Un pod est en CrashLoopBackOff. Quelle est la première action pertinente ?',
    options: [
      'Consulter les logs précédents et les events du pod',
      'Supprimer immédiatement le Deployment',
      'Redémarrer tout le cluster',
      'Augmenter la mémoire au hasard',
    ],
    correctIndex: 0,
    explanation:
      'Les logs avec --previous et les events donnent la cause probable avant toute modification.',
    strength: 'Diagnostic d’un conteneur en échec',
    watchpoint: 'Lecture des events et des logs Kubernetes',
  },
  {
    id: 'dq-4',
    topic: 'Tests',
    prompt: 'Un test échoue une fois sur cinq sans changement de code. Que faites-vous ?',
    options: [
      'Reproduire et isoler la dépendance instable avant de corriger',
      'Relancer le pipeline jusqu’au succès',
      'Supprimer le test devenu gênant',
      'Ignorer l’échec car il est intermittent',
    ],
    correctIndex: 0,
    explanation:
      'Un test instable masque souvent une régression réelle : il faut isoler la cause, pas la contourner.',
    strength: 'Fiabilisation des tests automatisés',
    watchpoint: 'Traitement des tests instables et des dépendances de test',
  },
];

const SCENARIO_OPTIONS = [
  'Lire les logs et le code de sortie, puis isoler une hypothèse avant de modifier le Dockerfile',
  'Reconstruire immédiatement l’image avec la balise latest',
  'Supprimer le pod et attendre qu’il se recrée',
  'Augmenter les ressources du cluster sans diagnostic',
];

const SCENARIO_CORRECT = 0;

/**
 * Entretien IA enrichi (CDC §5.X.1).
 *
 * Le parcours ne s'arrête plus à la conversation : il enchaîne une analyse du
 * CV, un quiz diagnostique et une mise en situation, puis produit une synthèse
 * avec trois actions concrètes. Les résultats sont enregistrés dans le
 * DataService et restent marqués comme déclarés / évalués.
 */
@Component({
  selector: 'wa-interview',
  imports: [
    DatePipe,
    FormsModule,
    RouterLink,
    MatButtonModule,
    MatProgressBarModule,
    PageHeader,
  ],
  templateUrl: './interview.html',
  styleUrl: './interview.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Interview {
  private readonly data = inject(DataService);
  private readonly auth = inject(AuthService);

  readonly questions = QUESTIONS;
  readonly diagnosticQuiz = DIAGNOSTIC_QUIZ;
  readonly scenarioOptions = SCENARIO_OPTIONS;

  readonly phase = signal<Phase>('CV');
  readonly step = signal(0);
  readonly draft = signal('');
  readonly finished = signal(false);

  readonly quizAnswers = signal<Record<string, number>>({});
  readonly quizSubmitted = signal(false);
  readonly scenarioChoice = signal<number | null>(null);
  readonly scenarioDraft = signal('');
  readonly scenarioSubmitted = signal(false);

  readonly diagnostic = this.data.interviewDiagnostic;

  private readonly initial: InterviewMessage[] = [
    {
      id: 'm1',
      author: 'AI',
      text: `Bonjour ${this.auth.user()?.name?.split(' ')[0] ?? ''}. J’ai analysé votre CV : développeur backend, expérience sur Java, Spring Boot et Git. Je vais préciser vos compétences réelles, puis nous terminerons par un quiz et une mise en situation.`,
      at: '2026-11-04T10:00:00',
    },
    {
      id: 'm2',
      author: 'AI',
      text: QUESTIONS[0].text,
      at: '2026-11-04T10:00:20',
    },
  ];

  readonly messages = signal<InterviewMessage[]>(this.initial);

  readonly currentQuestion = computed(() =>
    this.step() < QUESTIONS.length ? QUESTIONS[this.step()] : null,
  );

  readonly conversationProgress = computed(() =>
    Math.round((this.step() / QUESTIONS.length) * 100),
  );

  readonly stepIndex = computed(() => Math.min(this.step() + 1, QUESTIONS.length));

  readonly phases: { code: Phase; label: string }[] = [
    { code: 'CV', label: 'Analyse du CV' },
    { code: 'CONVERSATION', label: 'Conversation' },
    { code: 'QUIZ', label: 'Quiz diagnostique' },
    { code: 'SCENARIO', label: 'Mise en situation' },
    { code: 'SYNTHESIS', label: 'Synthèse et actions' },
  ];

  readonly phaseIndex = computed(() =>
    this.phases.findIndex((item) => item.code === this.phase()),
  );

  readonly progress = computed(() => {
    const index = this.phaseIndex();
    return Math.round(((index + 1) / this.phases.length) * 100);
  });

  readonly quizScore = computed(() => {
    const total = DIAGNOSTIC_QUIZ.length;
    if (!total) {
      return 0;
    }
    const correct = DIAGNOSTIC_QUIZ.filter(
      (question) => this.quizAnswers()[question.id] === question.correctIndex,
    ).length;
    return Math.round((correct / total) * 100);
  });

  readonly quizAnswered = computed(
    () => DIAGNOSTIC_QUIZ.every((question) => this.quizAnswers()[question.id] !== undefined),
  );

  readonly scenarioScore = computed(() => {
    const correct = this.scenarioChoice() === SCENARIO_CORRECT;
    const textScore = Math.min(40, Math.round(this.scenarioDraft().trim().length / 3));
    return Math.min(100, (correct ? 60 : 0) + textScore);
  });

  readonly globalScore = computed(() =>
    Math.round(this.quizScore() * 0.6 + this.scenarioScore() * 0.4),
  );

  readonly canSubmitScenario = computed(
    () => this.scenarioChoice() !== null && this.scenarioDraft().trim().length >= 80,
  );

  readonly strengths = computed(() =>
    DIAGNOSTIC_QUIZ.filter(
      (question) => this.quizAnswers()[question.id] === question.correctIndex,
    ).map((question) => question.strength),
  );

  readonly watchpoints = computed(() =>
    DIAGNOSTIC_QUIZ.filter(
      (question) => this.quizAnswers()[question.id] !== question.correctIndex,
    ).map((question) => question.watchpoint),
  );

  readonly actions = computed<InterviewAction[]>(() => {
    const score = this.globalScore();
    const weakTopic =
      DIAGNOSTIC_QUIZ.find(
        (question) => this.quizAnswers()[question.id] !== question.correctIndex,
      )?.topic ?? 'Docker';

    if (score < 70) {
      return [
        {
          title: `Consolider ${weakTopic}`,
          description: `Le diagnostic montre un besoin de consolidation sur ${weakTopic}. Choisissez une formation ciblée dans un format adapté.`,
          link: '/app/formations',
          action: 'Choisir une formation',
          tone: 'warning',
        },
        {
          title: 'Refaire un point dans deux semaines',
          description:
            'Un second entretien court permettra de vérifier la progression après la première formation.',
          link: '/app/entretien',
          action: 'Planifier un point',
          tone: 'primary',
        },
        {
          title: 'Mettre à jour mes compétences',
          description:
            'Les réponses du quiz et de la mise en situation enrichissent votre profil, avec leur source et leur confiance.',
          link: '/app/competences',
          action: 'Voir mes compétences',
          tone: 'success',
        },
      ];
    }

    return [
      {
        title: 'Passer à un projet pratique',
        description:
          'Vos acquis sont solides. Un projet en situation réelle consolidrera la compétence et produira une preuve observable.',
        link: '/app/formations',
        action: 'Choisir un projet',
        tone: 'success',
      },
      {
        title: 'Préparer l’évaluation finale',
        description:
          'Vous pouvez viser l’évaluation finale dans le format de votre choix parmi les sept disponibles.',
        link: '/app/parcours',
        action: 'Ouvrir mon parcours',
        tone: 'primary',
      },
      {
        title: 'Mettre à jour mes compétences',
        description:
          'Le diagnostic ajoute une source « Évalué » à votre profil, distincte des observations du poste.',
        link: '/app/competences',
        action: 'Voir mes compétences',
        tone: 'success',
      },
    ];
  });

  // ---------- Conversation ----------
  send(): void {
    const text = this.draft().trim();
    if (!text || this.finished() || this.phase() !== 'CONVERSATION') {
      return;
    }

    this.messages.update((list) => [
      ...list,
      { id: `u-${Date.now()}`, author: 'USER', text, at: new Date().toISOString() },
    ]);
    this.draft.set('');
    this.scrollChat();

    const answer = ANSWERS[this.step() % ANSWERS.length];
    const nextStep = this.step() + 1;
    const nextQuestion = nextStep < QUESTIONS.length ? QUESTIONS[nextStep].text : null;

    window.setTimeout(() => {
      this.messages.update((list) => [
        ...list,
        { id: `a-${Date.now()}`, author: 'AI', text: answer, at: new Date().toISOString() },
      ]);

      if (nextQuestion) {
        this.messages.update((list) => [
          ...list,
          { id: `q-${Date.now()}`, author: 'AI', text: nextQuestion, at: new Date().toISOString() },
        ]);
      } else {
        this.finished.set(true);
        this.messages.update((list) => [
          ...list,
          {
            id: `end-${Date.now()}`,
            author: 'AI',
            text: 'Merci, la conversation est terminée. Passons au quiz diagnostique pour vérifier les notions clés, puis à une mise en situation.',
            at: new Date().toISOString(),
          },
        ]);
      }
      this.scrollChat();
    }, 450);

    this.step.set(nextStep);
  }

  private scrollChat(): void {
    window.setTimeout(() => {
      const body = document.querySelector('.chat__body');
      body?.scrollTo({ top: body.scrollHeight, behavior: 'smooth' });
    }, 40);
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.send();
    }
  }

  // ---------- Navigation entre phases ----------
  startConversation(): void {
    this.phase.set('CONVERSATION');
  }

  goToQuiz(): void {
    this.phase.set('QUIZ');
  }

  answerQuiz(questionId: string, optionIndex: number): void {
    if (this.quizSubmitted()) {
      return;
    }
    this.quizAnswers.update((state) => ({ ...state, [questionId]: optionIndex }));
  }

  submitQuiz(): void {
    if (!this.quizAnswered()) {
      return;
    }
    this.quizSubmitted.set(true);
  }

  goToScenario(): void {
    this.phase.set('SCENARIO');
  }

  chooseScenario(index: number): void {
    if (!this.scenarioSubmitted()) {
      this.scenarioChoice.set(index);
    }
  }

  submitScenario(): void {
    if (!this.canSubmitScenario()) {
      return;
    }
    this.scenarioSubmitted.set(true);
    this.data.recordInterviewDiagnostic({
      quizScore: this.quizScore(),
      scenarioScore: this.scenarioScore(),
      globalScore: this.globalScore(),
      strengths: this.strengths(),
      watchpoints: this.watchpoints(),
      actions: this.actions(),
    });
    this.phase.set('SYNTHESIS');
  }

  restart(): void {
    this.phase.set('CV');
    this.step.set(0);
    this.draft.set('');
    this.finished.set(false);
    this.quizAnswers.set({});
    this.quizSubmitted.set(false);
    this.scenarioChoice.set(null);
    this.scenarioDraft.set('');
    this.scenarioSubmitted.set(false);
    this.messages.set([
      ...this.initial,
    ]);
  }

  isQuizCorrect(questionId: string, optionIndex: number): boolean {
    const question = DIAGNOSTIC_QUIZ.find((item) => item.id === questionId);
    return question?.correctIndex === optionIndex;
  }

  letter(index: number): string {
    return String.fromCharCode(65 + index);
  }

  toneClass(tone: InterviewAction['tone']): string {
    if (tone === 'success') {
      return 'wa-chip wa-chip--success';
    }
    if (tone === 'warning') {
      return 'wa-chip wa-chip--warning';
    }
    return 'wa-chip wa-chip--info';
  }
}
