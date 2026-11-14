import { computed, Injectable, signal } from '@angular/core';
import {
  AgentExchange,
  AgentStatus,
  AppNotification,
  ApprovalRequest,
  Assessment,
  AssessmentStage,
  AssessmentStageCode,
  AuditEntry,
  Certificate,
  Course,
  DataSource,
  EvaluationResult,
  FORMAT_LABELS,
  GeneratedEvaluation,
  GeneratedTraining,
  InterviewDiagnosticResult,
  Kpi,
  ModuleFormat,
  ProgressReport,
  ReportExport,
  Role,
  SkillEstimate,
  SkillGap,
  SkillHistoryEntry,
  SkillTrendSeries,
  TeamMember,
  TrainingFollowUp,
  TrainingFormatInfo,
  TrainingNeed,
  TrainingRequest,
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
  EVALUATION_RESULTS,
  INITIAL_NOTIFICATIONS,
  INITIAL_TRAINING_REQUESTS,
  KPIS,
  REPORT_EXPORTS,
  SKILLS,
  SKILL_HISTORY,
  SKILL_TRENDS,
  TEAM,
  TRAINING_FOLLOWUPS,
  TRAINING_FORMATS,
  TRAINING_NEEDS,
  WORKFLOWS,
} from '../data/mock-data';
import { generateEvaluation } from './evaluation-generator';
import { generateTraining } from './training-generator';

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
 * Recommandation de formats selon la nature de la compétence.
 * Cette table sera fournie par l'agent de recommandation côté backend.
 */
function formatsForSkill(code: string): ModuleFormat[] {
  const value = code.toLowerCase();
  if (value.includes('docker')) {
    return ['PRACTICAL', 'PROJECT', 'SIMULATION', 'MULTIMEDIA'];
  }
  if (value.includes('cicd')) {
    return ['PRACTICAL', 'PROJECT', 'SIMULATION', 'MULTIMEDIA'];
  }
  if (value.includes('kubernetes')) {
    return ['SIMULATION', 'PRACTICAL', 'PROJECT', 'MULTIMEDIA'];
  }
  if (value.includes('test')) {
    return ['INTERACTIVE', 'PRACTICAL', 'PROJECT'];
  }
  if (value.includes('angular') || value.includes('typescript')) {
    return ['MULTIMEDIA', 'PROJECT', 'INTERACTIVE'];
  }
  if (value.includes('git')) {
    return ['MULTIMEDIA', 'INTERACTIVE', 'PRACTICAL'];
  }
  return ['MULTIMEDIA', 'INTERACTIVE', 'PRACTICAL', 'PROJECT', 'SIMULATION', 'AI_TUTORED', 'COLLABORATIVE'];
}

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
  private readonly _skillHistory = signal<SkillHistoryEntry[]>(SKILL_HISTORY);
  readonly skillHistory = this._skillHistory.asReadonly();
  /** Échanges entre agents, du plus récent au plus ancien (CDC §11.5). */
  readonly agentExchanges = signal<AgentExchange[]>(AGENT_EXCHANGES).asReadonly();

  /* ------------------------------------------------------------------ *
   * Catalogue des sept formats de formation (CDC §5.X)
   * ------------------------------------------------------------------ */

  readonly formats = signal<TrainingFormatInfo[]>(TRAINING_FORMATS).asReadonly();

  /* ------------------------------------------------------------------ *
   * Suivi de l'équipe, résultats et besoins (CDC §11.3 et §11.4)
   * ------------------------------------------------------------------ */

  private readonly _trainingFollowups = signal<TrainingFollowUp[]>(TRAINING_FOLLOWUPS);
  readonly trainingFollowups = this._trainingFollowups.asReadonly();
  private readonly _evaluationResults = signal<EvaluationResult[]>(EVALUATION_RESULTS);
  readonly evaluationResults = this._evaluationResults.asReadonly();
  readonly trainingNeeds = signal<TrainingNeed[]>(TRAINING_NEEDS).asReadonly();
  readonly skillTrends = signal<SkillTrendSeries[]>(SKILL_TRENDS).asReadonly();
  private readonly _reportExports = signal<ReportExport[]>(REPORT_EXPORTS);
  readonly reportExports = this._reportExports.asReadonly();

  /* ------------------------------------------------------------------ *
   * Écarts détectés, notifications et demandes de formation (Lots 1 et 2)
   * ------------------------------------------------------------------ */

  private readonly _notifications = signal<AppNotification[]>(INITIAL_NOTIFICATIONS);
  readonly notifications = this._notifications.asReadonly();

  private readonly _trainingRequests = signal<TrainingRequest[]>(INITIAL_TRAINING_REQUESTS);
  readonly trainingRequests = this._trainingRequests.asReadonly();

  private readonly _trainings = signal<Record<string, GeneratedTraining>>({});
  readonly trainings = this._trainings.asReadonly();

  private readonly _evaluation = signal<GeneratedEvaluation | null>(null);
  readonly generatedEvaluation = this._evaluation.asReadonly();

  private readonly _interviewDiagnostic = signal<InterviewDiagnosticResult | null>(null);
  readonly interviewDiagnostic = this._interviewDiagnostic.asReadonly();

  /** Écarts calculés à partir des compétences, sources, formations et certifications. */
  readonly skillGaps = computed<SkillGap[]>(() =>
    this._skills()
      .map((skill) => {
        const gap = Math.max(0, skill.target - skill.level);
        const priority = (gap >= 30 ? 'HIGH' : gap >= 15 ? 'MEDIUM' : 'LOW') as SkillGap['priority'];
        return {
          id: `gap-${skill.code}`,
          skillCode: skill.code,
          skillLabel: skill.label,
          currentLevel: skill.level,
          targetLevel: skill.target,
          gap,
          priority,
          confidence: skill.confidence,
          evidence: [
            ...skill.evidence,
            `Source principale : ${skill.source.toLowerCase()} · confiance ${Math.round(skill.confidence * 100)} %.`,
            `Écart avec la cible du poste : ${gap} points.`,
          ],
          sources: [skill.source],
          recommendedFormats: formatsForSkill(skill.code),
        };
      })
      .filter((gap) => gap.gap > 0)
      .sort((a, b) => b.gap - a.gap),
  );

  readonly unreadNotificationCount = computed(
    () => this._notifications().filter((notification) => !notification.read).length,
  );

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

  /* ------------------------------------------------------------------ *
   * Notifications
   * ------------------------------------------------------------------ */

  notificationsFor(role: Role): AppNotification[] {
    return [...this._notifications()]
      .filter((notification) => notification.audience.includes(role))
      .sort((a, b) => b.at.localeCompare(a.at));
  }

  markNotificationRead(id: string): void {
    this._notifications.update((notifications) =>
      notifications.map((notification) =>
        notification.id === id ? { ...notification, read: true } : notification,
      ),
    );
  }

  markAllNotificationsRead(role: Role): void {
    this._notifications.update((notifications) =>
      notifications.map((notification) =>
        notification.audience.includes(role) ? { ...notification, read: true } : notification,
      ),
    );
  }

  private pushNotification(input: Omit<AppNotification, 'id' | 'at' | 'read'>): void {
    const notification: AppNotification = {
      ...input,
      id: `ntf-${Date.now()}-${this._notifications().length}`,
      at: new Date().toISOString(),
      read: false,
    };
    this._notifications.update((notifications) => [notification, ...notifications]);
  }

  /* ------------------------------------------------------------------ *
   * Demandes de formation et validation superviseur (Lots 1 et 2)
   * ------------------------------------------------------------------ */

  createTrainingRequest(input: {
    employeeId: string;
    employeeName: string;
    gap: SkillGap;
    format: ModuleFormat;
    subject: string;
    objective: string;
  }): TrainingRequest {
    const request: TrainingRequest = {
      id: `req-${Date.now().toString().slice(-6)}`,
      employeeId: input.employeeId,
      employeeName: input.employeeName,
      gapId: input.gap.id,
      skillCode: input.gap.skillCode,
      skillLabel: input.gap.skillLabel,
      subject: input.subject.trim(),
      objective: input.objective.trim(),
      format: input.format,
      levelFrom: input.gap.currentLevel,
      levelTo: input.gap.targetLevel,
      status: 'PENDING',
      requestedAt: new Date().toISOString(),
    };

    this._trainingRequests.update((requests) => [request, ...requests]);

    this.pushNotification({
      type: 'TRAINING_SUBMITTED',
      title: 'Demande de formation envoyée',
      message: `Votre demande « ${request.skillLabel} — ${request.subject} » (${FORMAT_LABELS[request.format]}) attend la validation du superviseur.`,
      link: '/app/formations',
      audience: ['EMPLOYEE'],
    });
    this.pushNotification({
      type: 'TRAINING_SUBMITTED',
      title: 'Nouvelle demande de formation',
      message: `${request.employeeName} demande une formation ${FORMAT_LABELS[request.format].toLowerCase()} sur « ${request.subject} ».`,
      link: '/app/validations',
      audience: ['MANAGER', 'ADMIN'],
    });

    return request;
  }

  decideTrainingRequest(
    id: string,
    decision: 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED',
    note?: string,
  ): void {
    const request = this._trainingRequests().find((item) => item.id === id);
    if (!request || request.status !== 'PENDING') {
      return;
    }

    let trainingId: string | undefined;
    if (decision === 'APPROVED') {
      const training = generateTraining({
        requestId: request.id,
        format: request.format,
        skillCode: request.skillCode,
        skillLabel: request.skillLabel,
        subject: request.subject,
        levelFrom: request.levelFrom,
        levelTo: request.levelTo,
      });
      trainingId = training.id;
      this._trainings.update((trainings) => ({ ...trainings, [training.id]: training }));
      this._trainingFollowups.update((followups) => [
        {
          id: `fol-${request.id}`,
          employee: request.employeeName,
          employeeId: request.employeeId,
          courseTitle: `${request.skillLabel} — ${request.subject}`,
          format: request.format,
          status: 'NOT_STARTED',
          progress: 0,
          updatedAt: new Date().toISOString().slice(0, 10),
        },
        ...followups,
      ]);
    }

    this._trainingRequests.update((requests) =>
      requests.map((item) =>
        item.id === id
          ? {
              ...item,
              status: decision,
              decidedAt: new Date().toISOString(),
              supervisorNote: note?.trim() || undefined,
              trainingId,
            }
          : item,
      ),
    );

    if (decision === 'APPROVED') {
      this.pushNotification({
        type: 'TRAINING_APPROVED',
        title: 'Formation approuvée',
        message: `Votre formation « ${request.skillLabel} — ${request.subject} » est approuvée. Vous pouvez la commencer.`,
        link: `/app/formations/${request.id}`,
        audience: ['EMPLOYEE'],
      });
    } else if (decision === 'REJECTED') {
      this.pushNotification({
        type: 'TRAINING_REJECTED',
        title: 'Demande de formation rejetée',
        message: `Votre demande « ${request.skillLabel} — ${request.subject} » a été rejetée.${note ? ' Motif : ' + note : ''}`,
        link: '/app/formations',
        audience: ['EMPLOYEE'],
      });
    } else {
      this.pushNotification({
        type: 'CHANGES_REQUESTED',
        title: 'Modification demandée',
        message: `Le superviseur demande une modification sur « ${request.skillLabel} — ${request.subject} ».${note ? ' Précision : ' + note : ''}`,
        link: '/app/formations',
        audience: ['EMPLOYEE'],
      });
    }
  }

  startTraining(requestId: string): void {
    this._trainingRequests.update((requests) =>
      requests.map((item) =>
        item.id === requestId && item.status === 'APPROVED'
          ? { ...item, status: 'IN_PROGRESS' }
          : item,
      ),
    );
    this._trainingFollowups.update((followups) =>
      followups.map((followup) =>
        followup.id === `fol-${requestId}`
          ? { ...followup, status: 'IN_PROGRESS', updatedAt: new Date().toISOString().slice(0, 10) }
          : followup,
      ),
    );
  }

  completeTraining(requestId: string): void {
    const request = this._trainingRequests().find((item) => item.id === requestId);
    if (!request) {
      return;
    }

    this._trainingRequests.update((requests) =>
      requests.map((item) =>
        item.id === requestId ? { ...item, status: 'COMPLETED' } : item,
      ),
    );
    this._trainingFollowups.update((followups) =>
      followups.map((followup) =>
        followup.id === `fol-${requestId}`
          ? {
              ...followup,
              status: 'COMPLETED',
              progress: 100,
              updatedAt: new Date().toISOString().slice(0, 10),
            }
          : followup,
      ),
    );

    this._skills.update((skills) =>
      skills.map((skill) =>
        skill.code === request.skillCode
          ? { ...skill, level: Math.min(100, skill.level + 5), trend: skill.trend + 5, source: 'ASSESSED' }
          : skill,
      ),
    );
    this._skillHistory.update((history) => [
      {
        id: `hist-${Date.now()}`,
        at: new Date().toISOString(),
        skill: request.skillLabel,
        previousLevel: request.levelFrom,
        newLevel: Math.min(100, request.levelFrom + 5),
        source: 'ASSESSED',
        cause: `Formation terminée : ${request.subject}`,
      },
      ...history,
    ]);

    this.pushNotification({
      type: 'TRAINING_COMPLETED',
      title: 'Formation terminée',
      message: `Vous avez terminé « ${request.skillLabel} — ${request.subject} ». L’évaluation finale est disponible.`,
      link: '/app/parcours',
      audience: ['EMPLOYEE'],
    });
    this.pushNotification({
      type: 'TRAINING_COMPLETED',
      title: 'Formation terminée dans l’équipe',
      message: `${request.employeeName} a terminé la formation « ${request.skillLabel} — ${request.subject} ».`,
      link: '/app/suivi-formations',
      audience: ['MANAGER', 'ADMIN'],
    });
  }

  trainingFor(requestId: string): GeneratedTraining | null {
    const request = this._trainingRequests().find((item) => item.id === requestId);
    if (!request?.trainingId) {
      return null;
    }
    return this._trainings()[request.trainingId] ?? null;
  }

  /* ------------------------------------------------------------------ *
   * Évaluation finale générée dans le format choisi (Lot 4)
   * ------------------------------------------------------------------ */

  prepareEvaluation(format: ModuleFormat): GeneratedEvaluation {
    const course = this.activeCourse() ?? this._courses()[0];
    if (!course) {
      throw new Error('Aucun parcours disponible pour générer une évaluation.');
    }
    const evaluation = generateEvaluation({
      courseId: course.id,
      courseTitle: course.title,
      skills: course.skills,
      levelFrom: course.levelFrom,
      levelTo: course.levelTo,
      format,
    });
    this._evaluation.set(evaluation);
    return evaluation;
  }

  completeEvaluation(input: {
    score: number;
    format: ModuleFormat;
    employeeId: string;
    employeeName: string;
    criteria: string[];
  }): Certificate | null {
    const evaluation = this._evaluation();
    const course = this.activeCourse() ?? this._courses()[0];
    const courseTitle = evaluation?.courseTitle ?? course?.title ?? 'Parcours';
    const courseId = evaluation?.courseId ?? course?.id ?? 'crs-demo';
    const passed = input.score >= 75;

    let certificate: Certificate | null = null;
    if (passed) {
      const existing = this._certificates().find(
        (item) => item.courseId === courseId && item.score === input.score,
      );
      if (existing) {
        certificate = existing;
      } else {
        const year = new Date().getFullYear();
        certificate = {
          id: `WA-${year}-${String(400 + this._certificates().length).padStart(6, '0')}`,
          title: courseTitle,
          skills: course?.skills ?? [],
          issuedAt: new Date().toISOString().slice(0, 10),
          score: input.score,
          practicalPassed: true,
          level: course?.levelTo ?? input.score,
          courseId,
          criteria: input.criteria,
        };
        this._certificates.update((certificates) => [certificate!, ...certificates]);
      }
    }

    this._evaluationResults.update((results) => [
      {
        id: `res-${Date.now()}`,
        employee: input.employeeName,
        employeeId: input.employeeId,
        courseTitle,
        evaluationFormat: input.format,
        score: input.score,
        passed,
        at: new Date().toISOString().slice(0, 10),
        certificateId: certificate?.id,
      },
      ...results,
    ]);

    if (certificate) {
      this.pushNotification({
        type: 'CERTIFICATE_ISSUED',
        title: 'Certificat interne délivré',
        message: `Votre évaluation ${input.format.toLowerCase()} est réussie avec ${input.score} / 100. Certificat ${certificate.id}.`,
        link: '/app/certificats',
        audience: ['EMPLOYEE'],
      });
    } else {
      this.pushNotification({
        type: 'EVALUATION_READY',
        title: 'Évaluation à consolider',
        message: `Votre évaluation ${input.format.toLowerCase()} obtient ${input.score} / 100. Un parcours de consolidation peut être demandé à votre superviseur.`,
        link: '/app/formations',
        audience: ['EMPLOYEE'],
      });
    }

    return certificate;
  }

  /* ------------------------------------------------------------------ *
   * Entretien IA : activités diagnostiques et synthèse (Lot 5)
   * ------------------------------------------------------------------ */

  recordInterviewDiagnostic(
    input: Omit<InterviewDiagnosticResult, 'id' | 'at'>,
  ): InterviewDiagnosticResult {
    const result: InterviewDiagnosticResult = {
      ...input,
      id: `diag-${Date.now().toString().slice(-6)}`,
      at: new Date().toISOString(),
    };
    this._interviewDiagnostic.set(result);

    this.pushNotification({
      type: 'GAP_DETECTED',
      title: 'Entretien diagnostique terminé',
      message: `Votre entretien IA est complété. Score global ${result.globalScore} / 100 — trois actions concrètes sont proposées dans la synthèse.`,
      link: '/app/entretien',
      audience: ['EMPLOYEE'],
    });

    return result;
  }

  /**
   * Enregistre un rapport de démonstration. Le contenu CSV/PDF reste simulé
   * côté frontend ; l'entrée apparaît immédiatement dans l'historique.
   */
  generateReport(input: { title: string; period: string; scope: string; format: 'CSV' | 'PDF' }): ReportExport {
    const report: ReportExport = {
      id: `rpt-${String(Date.now()).slice(-6)}`,
      title: input.title,
      period: input.period,
      scope: input.scope,
      format: input.format,
      generatedAt: new Date().toISOString().slice(0, 10),
      records: this.team().filter((member) => member.status === 'ACTIVE').length,
    };
    this._reportExports.update((reports) => [report, ...reports]);
    return report;
  }
}
