import { computed, Injectable, signal } from '@angular/core';
import {
  AgentExchange,
  AgentStatus,
  ApprovalRequest,
  Assessment,
  AssessmentStage,
  AssessmentStageCode,
  AuditEntry,
  Certificate,
  Course,
  DataSource,
  Kpi,
  ProgressReport,
  SkillEstimate,
  SkillHistoryEntry,
  TeamMember,
  TrainingFormatInfo,
  WorkflowRun,
} from '../models';
import {
  AGENT_EXCHANGES,
  AGENTS,
  APPROVALS,
  AUDIT,
  CERTIFICATES,
  COURSES,
  DATA_SOURCES,
  DOCKER_ASSESSMENT,
  KPIS,
  SKILLS,
  SKILL_HISTORY,
  TEAM,
  TRAINING_FORMATS,
  WORKFLOWS,
} from '../data/mock-data';

/** Libellés et descriptions des six étapes du processus post-formation (CDC §5.X.3). */
const ASSESSMENT_STAGES: { code: AssessmentStageCode; label: string; description: string }[] = [
  {
    code: 'QUIZ',
    label: 'Quiz final',
    description: 'Vérifier les connaissances théoriques',
  },
  {
    code: 'PRACTICAL',
    label: 'Évaluation pratique',
    description: 'Vérifier la capacité à appliquer',
  },
  {
    code: 'FEEDBACK',
    label: 'Feedback IA',
    description: 'Expliquer les erreurs et les acquis',
  },
  {
    code: 'REPORT',
    label: 'Rapport de progression',
    description: 'Scores, acquis et difficultés',
  },
  {
    code: 'CERTIFICATE',
    label: 'Certificat interne',
    description: 'Délivré si les critères sont remplis',
  },
  {
    code: 'RECOMMENDATIONS',
    label: 'Recommandations',
    description: 'Proposer la suite du parcours',
  },
];

/**
 * Point d'accès unique aux données du frontend.
 *
 * Aujourd'hui : données de démonstration en mémoire.
 * Demain : mêmes signatures, mais branchées sur l'API Spring Boot
 * (`/api/v1/skills`, `/api/v1/courses`, ...). Les composants n'auront pas
 * à changer.
 */
@Injectable({ providedIn: 'root' })
export class DataService {
  private readonly _skills = signal<SkillEstimate[]>(SKILLS);
  private readonly _courses = signal<Course[]>(COURSES);
  private readonly _approvals = signal<ApprovalRequest[]>(APPROVALS);
  private readonly _certificates = signal<Certificate[]>(CERTIFICATES);
  private readonly _agents = signal<AgentStatus[]>(AGENTS);
  private readonly _workflows = signal<WorkflowRun[]>(WORKFLOWS);

  readonly skills = this._skills.asReadonly();
  readonly courses = this._courses.asReadonly();
  readonly approvals = this._approvals.asReadonly();
  readonly certificates = this._certificates.asReadonly();
  readonly agents = this._agents.asReadonly();
  readonly workflows = this._workflows.asReadonly();
  readonly kpis = signal<Kpi[]>(KPIS).asReadonly();
  readonly audit = signal<AuditEntry[]>(AUDIT).asReadonly();
  readonly team = signal<TeamMember[]>(TEAM).asReadonly();
  readonly sources = signal<DataSource[]>(DATA_SOURCES).asReadonly();
  /** Historique des évolutions du profil, du plus récent au plus ancien (CDC §11.1). */
  readonly skillHistory = signal<SkillHistoryEntry[]>(SKILL_HISTORY).asReadonly();
  /** Échanges entre agents, du plus récent au plus ancien (CDC §11.5). */
  readonly agentExchanges = signal<AgentExchange[]>(AGENT_EXCHANGES).asReadonly();

  /* ------------------------------------------------------------------ *
   * Catalogue des sept formats de formation (CDC §5.X)
   * ------------------------------------------------------------------ */

  readonly formats = signal<TrainingFormatInfo[]>(TRAINING_FORMATS).asReadonly();

  /* ------------------------------------------------------------------ *
   * Évaluation finale et certification (CDC §5.X.2)
   * ------------------------------------------------------------------ */

  private readonly _assessment = signal<Assessment>(DOCKER_ASSESSMENT);
  private readonly _answers = signal<Record<string, number>>({});
  private readonly _quizSubmitted = signal(false);
  private readonly _practicalSubmitted = signal(false);
  private readonly _practicalSubmission = signal('');
  private readonly _stage = signal<AssessmentStageCode>('QUIZ');
  private readonly _certificateIssued = signal(false);

  readonly assessment = this._assessment.asReadonly();
  readonly answers = this._answers.asReadonly();
  readonly quizSubmitted = this._quizSubmitted.asReadonly();
  readonly practicalSubmitted = this._practicalSubmitted.asReadonly();
  readonly practicalSubmission = this._practicalSubmission.asReadonly();

  readonly quizTotal = computed(() => this._assessment().quiz.length);

  readonly answeredCount = computed(() => Object.keys(this._answers()).length);

  /** Score pondéré simple : une question = un point. */
  readonly quizScore = computed(() => {
    const questions = this._assessment().quiz;
    if (questions.length === 0) {
      return 0;
    }
    const answers = this._answers();
    const correct = questions.filter((question) => answers[question.id] === question.correctIndex).length;
    return Math.round((correct / questions.length) * 100);
  });

  readonly quizComplete = computed(
    () => this.quizTotal() > 0 && this.answeredCount() === this.quizTotal(),
  );

  readonly quizPassed = computed(
    () => this._quizSubmitted() && this.quizScore() >= this._assessment().passScore,
  );

  readonly practicalPassed = computed(
    () =>
      this._practicalSubmitted() &&
      !this._assessment().practical.criteria.some((criterion) => criterion.result === 'NOT_MET'),
  );

  /** Le certificat exige le seuil du quiz **et** la réussite pratique (CDC §5.X.2.5). */
  readonly certificateEligible = computed(() => this.quizPassed() && this.practicalPassed());

  /** Index de la dernière étape accessible du processus post-formation. */
  readonly assessmentUnlockedIndex = computed(() => {
    if (!this.quizPassed()) {
      return 0;
    }
    if (!this._practicalSubmitted()) {
      return 1;
    }
    return ASSESSMENT_STAGES.length - 1;
  });

  readonly assessmentStage = this._stage.asReadonly();

  readonly assessmentStages = computed<AssessmentStage[]>(() => {
    const current = ASSESSMENT_STAGES.findIndex((stage) => stage.code === this._stage());
    const unlocked = this.assessmentUnlockedIndex();
    return ASSESSMENT_STAGES.map((stage, index) => ({
      ...stage,
      status:
        index < current
          ? 'DONE'
          : index === current
            ? 'CURRENT'
            : index <= unlocked
              ? 'AVAILABLE'
              : 'LOCKED',
    }));
  });

  /** Rapport recalculé à partir des résultats réels de la session. */
  readonly assessmentReport = computed<ProgressReport>(() => {
    const base = this._assessment().report;
    const score = this.quizScore();
    const ratio = score / 100;
    return {
      ...base,
      quizScore: score,
      practicalResult: this._practicalSubmitted()
        ? this.practicalPassed()
          ? 'Réussie'
          : 'Échouée'
        : 'En attente',
      levelAfter: Math.round(base.levelBefore + (base.levelAfter - base.levelBefore) * ratio),
    };
  });

  hasAssessment(courseId: string): boolean {
    return this._assessment().courseId === courseId;
  }

  answerQuestion(questionId: string, optionIndex: number): void {
    if (this._quizSubmitted()) {
      return;
    }
    this._answers.update((answers) => ({ ...answers, [questionId]: optionIndex }));
  }

  submitQuiz(): boolean {
    if (!this.quizComplete()) {
      return false;
    }
    this._quizSubmitted.set(true);
    return true;
  }

  retryQuiz(): void {
    this._answers.set({});
    this._quizSubmitted.set(false);
    this._practicalSubmitted.set(false);
    this._practicalSubmission.set('');
    this._stage.set('QUIZ');
  }

  submitPractical(submission: string): void {
    this._practicalSubmission.set(submission);
    this._practicalSubmitted.set(true);
  }

  /** Déplace la navigation dans le processus, sans jamais sauter une étape verrouillée. */
  goToAssessmentStage(code: AssessmentStageCode): boolean {
    const index = ASSESSMENT_STAGES.findIndex((stage) => stage.code === code);
    if (index < 0 || index > this.assessmentUnlockedIndex()) {
      return false;
    }
    this._stage.set(code);
    if (code === 'CERTIFICATE' && this.certificateEligible()) {
      this.issueCertificate();
    }
    return true;
  }

  /** Délivre le certificat interne une seule fois, avec les critères validés. */
  issueCertificate(): void {
    if (!this.certificateEligible() || this._certificateIssued()) {
      return;
    }
    this._certificateIssued.set(true);

    const assessment = this._assessment();
    const report = this.assessmentReport();
    const year = new Date().getFullYear();
    const certificate: Certificate = {
      id: `WA-${year}-${String(300 + this._certificates().length).padStart(6, '0')}`,
      title: report.courseTitle,
      skills: report.skills,
      issuedAt: new Date().toISOString().slice(0, 10),
      score: report.quizScore,
      practicalPassed: this.practicalPassed(),
      level: report.levelAfter,
      courseId: assessment.courseId,
      criteria: [
        `Quiz final ≥ ${assessment.passScore} %`,
        ...assessment.practical.criteria.map((criterion) => criterion.label),
      ],
    };

    this._certificates.update((certificates) => [certificate, ...certificates]);
  }

  readonly activeCourse = computed(
    () =>
      this._courses().find((course) => course.status === 'IN_PROGRESS') ??
      this._courses()[0] ??
      null,
  );

  readonly pendingApprovals = computed(() =>
    this._approvals().filter((request) => request.status === 'PENDING'),
  );

  readonly averageLevel = computed(() => {
    const skills = this._skills();
    if (skills.length === 0) {
      return 0;
    }
    return Math.round(skills.reduce((sum, skill) => sum + skill.level, 0) / skills.length);
  });

  readonly averageGap = computed(() => {
    const gaps = this._skills().filter((skill) => skill.level < skill.target);
    if (gaps.length === 0) {
      return 0;
    }
    return Math.round(gaps.reduce((sum, skill) => sum + (skill.target - skill.level), 0) / gaps.length);
  });

  readonly atRiskSkills = computed(() => this._skills().filter((skill) => skill.target - skill.level >= 20));

  decideApproval(id: string, decision: 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED'): void {
    this._approvals.update((requests) =>
      requests.map((request) => (request.id === id ? { ...request, status: decision } : request)),
    );
  }

  setModuleProgress(courseId: string, moduleOrder: number, progress: number): void {
    this._courses.update((courses) =>
      courses.map((course) => {
        if (course.id !== courseId) {
          return course;
        }
        const modules = course.modules.map((module) =>
          module.order === moduleOrder
            ? {
                ...module,
                progress,
                status: progress >= 100 ? ('DONE' as const) : ('IN_PROGRESS' as const),
              }
            : module,
        );
        const total = modules.reduce((sum, module) => sum + module.progress, 0);
        return {
          ...course,
          modules,
          progress: Math.round(total / modules.length),
        };
      }),
    );
  }
}
