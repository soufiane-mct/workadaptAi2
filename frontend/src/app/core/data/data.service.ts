import { computed, inject, Injectable } from '@angular/core';
import {
  AgentExchange,
  AgentStatus,
  AppNotification,
  AuditEntry,
  Certificate,
  CollectionEvent,
  CollectionRun,
  DataSource,
  EVALUATION_METHOD_INFO,
  EVALUATION_METHOD_LABELS,
  EVALUATION_METHODS,
  EvaluationAnswers,
  EvaluationMethod,
  EvaluationRecord,
  EvaluationReport,
  FORMAT_LABELS,
  GAP_LIFECYCLE_LABELS,
  Kpi,
  OnboardingProfile,
  ReportExport,
  SKILL_SOURCE_LABELS,
  SkillEstimate,
  SkillGap,
  SkillHistoryEntry,
  SkillTrendSeries,
  StepEvidence,
  StepVerification,
  TeamMember,
  TRAINING_FORMATS,
  TRAINING_REQUEST_STATUS_LABELS,
  TrainingFormat,
  TrainingFormatInfo,
  TrainingFollowUp,
  TrainingNeed,
  TrainingProgram,
  TrainingProgress,
  TrainingRequest,
  WorkflowRun,
} from '../models';
import { AuthService } from '../auth/auth.service';
import { AuditService } from './audit.service';
import { CertificationService } from './certification.service';
import { CollectionService } from './collection.service';
import { EvaluationService } from './evaluation.service';
import { GapService } from './gap.service';
import { NotificationService } from './notification.service';
import { ProfileService } from './profile.service';
import { StepVerificationService } from './step-verification.service';
import { TechWatchService } from './tech-watch.service';
import { TrainingService } from './training.service';
import { WorkflowStateService } from './workflow-state.service';
import { DemoStateStore } from './demo-state.store';
import {
  AGENT_EXCHANGES,
  AGENTS,
  KPIS,
  REPORT_EXPORTS,
  SKILL_TRENDS,
  INITIAL_TEAM,
  TRAINING_FORMAT_CATALOG,
  TRAINING_NEEDS,
  WORKFLOWS,
} from './mock-data';

/**
 * Façade d'agrégats pour les écrans.
 *
 * Elle ne contient aucune règle métier : chaque domaine garde la sienne.
 * Un composant qui déclenche une action passe par la façade, qui délègue
 * au service compétent.
 */
@Injectable({ providedIn: 'root' })
export class DataService {
  readonly auth = inject(AuthService);
  readonly profileService = inject(ProfileService);
  readonly gapService = inject(GapService);
  readonly trainingService = inject(TrainingService);
  readonly evaluationService = inject(EvaluationService);
  readonly certificationService = inject(CertificationService);
  readonly collectionService = inject(CollectionService);
  readonly techWatchService = inject(TechWatchService);
  readonly notificationService = inject(NotificationService);
  readonly auditService = inject(AuditService);
  readonly workflow = inject(WorkflowStateService);
  readonly stepVerificationService = inject(StepVerificationService);
  private readonly demoState = inject(DemoStateStore);

  /* ---------------------------------------------------------------- *
   * Référentiels
   * ---------------------------------------------------------------- */

  readonly formats = TRAINING_FORMATS;
  readonly formatCatalog: TrainingFormatInfo[] = TRAINING_FORMAT_CATALOG;
  readonly formatLabels = FORMAT_LABELS;
  readonly methods = EVALUATION_METHODS;
  readonly methodLabels = EVALUATION_METHOD_LABELS;
  readonly methodInfo = EVALUATION_METHOD_INFO;
  readonly requestStatusLabels = TRAINING_REQUEST_STATUS_LABELS;
  readonly gapStatusLabels = GAP_LIFECYCLE_LABELS;
  readonly skillSourceLabels = SKILL_SOURCE_LABELS;

  readonly kpis: Kpi[] = KPIS;
  /** Identités de l'annuaire, sans progression ni compétence. */
  readonly directoryTeam: TeamMember[] = INITIAL_TEAM;
  /** Annuaire administratif : identités et rôles, sans aucune donnée de compétence. */
  readonly accounts = computed(() => this.auth.accounts());
  readonly needs: TrainingNeed[] = TRAINING_NEEDS;
  readonly trends: SkillTrendSeries[] = SKILL_TRENDS;
  readonly reports: ReportExport[] = REPORT_EXPORTS;
  readonly agents: AgentStatus[] = AGENTS;
  readonly workflows: WorkflowRun[] = WORKFLOWS;
  readonly exchanges: AgentExchange[] = AGENT_EXCHANGES;

  /* ---------------------------------------------------------------- *
   * Utilisateur et profil
   * ---------------------------------------------------------------- */

  readonly user = this.auth.user;
  readonly profile = this.profileService.profile;
  readonly skills = this.profileService.skills;
  readonly skillHistory = this.profileService.history;
  readonly fullName = this.profileService.fullName;
  readonly averageLevel = this.profileService.averageLevel;
  readonly atRiskSkills = this.profileService.atRiskSkills;
  readonly totalGapPoints = this.profileService.totalGapPoints;
  readonly profileComplete = this.profileService.profileComplete;

  /* ---------------------------------------------------------------- *
   * Écarts
   * ---------------------------------------------------------------- */

  readonly gaps = this.gapService.gaps;
  readonly actionableGaps = this.gapService.actionable;
  readonly queuedGaps = this.gapService.queued;
  readonly gapsInTraining = this.gapService.inTraining;
  readonly resolvedGaps = this.gapService.resolved;
  readonly newGapsCount = this.gapService.newCount;

  /* ---------------------------------------------------------------- *
   * Formation
   * ---------------------------------------------------------------- */

  readonly requests = this.trainingService.requests;
  readonly programs = this.trainingService.programs;
  readonly progresses = this.trainingService.progresses;
  readonly pendingRequests = this.trainingService.pending;
  readonly trainingInProgress = this.trainingService.inProgress;
  readonly completedTrainings = this.trainingService.completed;
  readonly activeTrainingRequestId = this.workflow.activeTrainingRequestId;
  readonly demoMode = this.workflow.demoMode;

  /* ---------------------------------------------------------------- *
   * Évaluation et certification
   * ---------------------------------------------------------------- */

  readonly evaluations = this.evaluationService.records;
  readonly evaluationReports = this.evaluationService.reports;
  readonly certificates = this.certificationService.certificates;
  readonly issuedCertificates = this.certificationService.issued;

  /**
   * Périmètre de l'employé connecté.
   *
   * Les écrans personnels (« Mes formations », « Mes certificats ») ne
   * doivent jamais exposer le parcours d'un autre employé : les listes
   * sont filtrées par l'identifiant métier de l'utilisateur connecté.
   * Les vues superviseur/RH continuent d'utiliser les agrégats globaux.
   */
  readonly myRequests = computed(() => {
    const employeeId = this.profileService.employeeId();
    return this.trainingService
      .requests()
      .filter((request) => request.employeeId === employeeId);
  });
  readonly myPendingRequests = computed(() =>
    this.myRequests().filter((request) => request.status === 'PENDING'),
  );
  readonly myTrainingInProgress = computed(() =>
    this.myRequests().filter((request) => request.status === 'IN_PROGRESS'),
  );
  readonly myCompletedTrainings = computed(() =>
    this.myRequests().filter((request) => request.status === 'COMPLETED'),
  );
  readonly myCertificates = computed(() => {
    const employeeId = this.profileService.employeeId();
    return this.certificationService
      .certificates()
      .filter((certificate) => certificate.employeeId === employeeId);
  });
  readonly myIssuedCertificates = computed(() => {
    const employeeId = this.profileService.employeeId();
    return this.certificationService
      .issued()
      .filter((certificate) => certificate.employeeId === employeeId);
  });

  /** Détails strictement limités à l'employé connecté. */
  myRequestById(requestId: string): TrainingRequest | undefined {
    const employeeId = this.profileService.employeeId();
    return this.trainingService
      .requests()
      .find((request) => request.id === requestId && request.employeeId === employeeId);
  }

  myProgramFor(requestId: string): TrainingProgram | undefined {
    return this.myRequestById(requestId)
      ? this.trainingService.programFor(requestId)
      : undefined;
  }

  myProgressFor(requestId: string): TrainingProgress | undefined {
    return this.myRequestById(requestId)
      ? this.trainingService.progressFor(requestId)
      : undefined;
  }

  myGapById(gapId: string): SkillGap | undefined {
    return this.gapService.byId(gapId, this.profileService.employeeId());
  }

  myEvaluationById(evaluationId: string): EvaluationRecord | undefined {
    const employeeId = this.profileService.employeeId();
    return this.evaluationService
      .records()
      .find((record) => record.id === evaluationId && record.employeeId === employeeId);
  }

  myEvaluationFor(requestId: string): EvaluationRecord | undefined {
    return this.evaluationService.forRequestFor(
      requestId,
      this.profileService.employeeId(),
    );
  }

  myReportFor(evaluationId: string): EvaluationReport | undefined {
    return this.evaluationService.reportForEmployee(
      evaluationId,
      this.profileService.employeeId(),
    );
  }

  myCertificateFor(requestId: string): Certificate | undefined {
    return this.certificationService.forRequestFor(
      requestId,
      this.profileService.employeeId(),
    );
  }

  myCertificateById(id: string): Certificate | undefined {
    return this.certificationService.byIdFor(id, this.profileService.employeeId());
  }

  /* ---------------------------------------------------------------- *
   * Collecte, veille, notifications, audit
   * ---------------------------------------------------------------- */

  readonly collectionEvents = this.collectionService.events;
  readonly collectionRuns = this.collectionService.runs;
  readonly dataSources = this.collectionService.sources;
  readonly collectionRunning = this.workflow.collectionRunning;
  readonly techSignals = this.techWatchService.signals;
  readonly notifications = this.notificationService.notifications;
  readonly auditEntries = this.auditService.entries;

  readonly unreadNotifications = computed(() => {
    const role = this.auth.role();
    return role ? this.notificationService.unreadFor(role, this.profileService.employeeId()) : 0;
  });

  /* ---------------------------------------------------------------- *
   * Lectures utilitaires
   * ---------------------------------------------------------------- */

  programFor(requestId: string): TrainingProgram | undefined {
    return this.trainingService.programFor(requestId);
  }

  progressFor(requestId: string): TrainingProgress | undefined {
    return this.trainingService.progressFor(requestId);
  }

  requestById(requestId: string): TrainingRequest | undefined {
    return this.trainingService.requestById(requestId);
  }

  gapById(gapId: string): SkillGap | undefined {
    return this.gapService.byId(gapId);
  }

  skillByCode(code: string): SkillEstimate | undefined {
    return this.profileService.skill(code);
  }

  evaluationFor(requestId: string): EvaluationRecord | undefined {
    return this.evaluationService.forRequest(requestId);
  }

  reportFor(evaluationId: string): EvaluationReport | undefined {
    return this.evaluationService.reportFor(evaluationId);
  }

  certificateFor(requestId: string): Certificate | undefined {
    return this.certificationService.forRequest(requestId);
  }

  certificateById(id: string): Certificate | undefined {
    return this.certificationService.byId(id);
  }

  eventsForSkill(code: string): CollectionEvent[] {
    return this.collectionService.eventsForSkill(code);
  }

  historyFor(code: string): SkillHistoryEntry[] {
    return this.profileService.historyFor(code);
  }

  notificationsForCurrentRole(): AppNotification[] {
    const role = this.auth.role();
    return role ? this.notificationService.forRole(role, this.profileService.employeeId()) : [];
  }

  sourcesByStatus(status: DataSource['status']): DataSource[] {
    return this.dataSources().filter((source) => source.status === status);
  }

  runs(limit = 10): CollectionRun[] {
    return this.collectionRuns().slice(0, limit);
  }

  auditFor(target: string): AuditEntry[] {
    return this.auditService.forTarget(target);
  }

  /**
   * Politique de consentement : partage au superviseur.
   *
   * Le retrait du consentement prend effet immédiatement (CDC §12) : les
   * projections nominatives vers le superviseur (suivi, résultats,
   * certificats) sont suspendues pour l'employé concerné. Le workflow de
   * validation du curriculum reste inchangé : le superviseur doit pouvoir
   * statuer sur la demande qu'il reçoit.
   */
  private readonly supervisorBlocked = computed(() => {
    const employeeIds = new Set<string>([
      ...Object.keys(this.profileService.profiles()),
      ...this.requests().map((request) => request.employeeId),
    ]);
    return new Set(
      Array.from(employeeIds).filter((employeeId) => !this.profileService.consentFor(employeeId)),
    );
  });

  /**
   * Équipe superviseur dérivée du workflow réel.
   *
   * Les mêmes demandes, progrès, résultats et certificats alimentent le
   * tableau de bord, le suivi et la fiche d'équipe. Un collaborateur sans
   * partage explicite avec son superviseur n'y apparaît pas.
   */
  readonly supervisorTeam = computed<TeamMember[]>(() => {
    const blocked = this.supervisorBlocked();
    const employeeIds = new Set<string>([
      ...this.requests().map((request) => request.employeeId),
      ...this.certificates().map((certificate) => certificate.employeeId),
      ...this.evaluationReports()
        .map((report) => this.requestById(report.requestId)?.employeeId ?? '')
        .filter(Boolean),
    ]);

    return Array.from(employeeIds)
      .filter((employeeId) => !blocked.has(employeeId))
      .map((employeeId) => {
        const profile = this.profileService.profileFor(employeeId);
        const requests = this.requests()
          .filter((request) => request.employeeId === employeeId)
          .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
        const activeRequest = requests.find((request) => request.status === 'IN_PROGRESS');
        const progress = activeRequest ? this.progressFor(activeRequest.id) : undefined;
        const skills = this.profileService.skillsFor(employeeId);
        const certificates = this.certificates().filter(
          (certificate) => certificate.employeeId === employeeId,
        );
        const reports = this.evaluationReports()
          .filter(
            (report) => this.requestById(report.requestId)?.employeeId === employeeId,
          )
          .sort((a, b) => b.at.localeCompare(a.at));
        const lastReport = reports[0];
        const averageLevel =
          skills.length === 0
            ? 0
            : Math.round(skills.reduce((sum, skill) => sum + skill.level, 0) / skills.length);

        return {
          id: employeeId,
          name:
            `${profile.firstName} ${profile.lastName}`.trim() ||
            requests[0]?.employeeName ||
            'Collaborateur',
          email: profile.email,
          role: 'EMPLOYEE' as const,
          jobTitle: profile.jobTitle,
          department: profile.department,
          status: 'ACTIVE' as const,
          skillsTracked: skills.length,
          averageLevel,
          certifications: certificates.length,
          activeFormation: activeRequest
            ? (this.programFor(activeRequest.id)?.title ?? activeRequest.subject)
            : undefined,
          formationProgress: activeRequest?.progressPercent ?? 0,
          lastEvaluation: lastReport
            ? {
                method: lastReport.method,
                score: lastReport.score,
                decision: lastReport.decision,
                at: lastReport.at,
              }
            : undefined,
          skills: skills.map((skill) => ({
            code: skill.code,
            label: skill.label,
            level: skill.level,
            target: skill.target,
            confidence: skill.confidence,
            source: skill.source,
          })),
          lastActivityAt:
            progress?.lastActivityAt ?? requests[0]?.requestedAt ?? certificates[0]?.issuedAt,
        } satisfies TeamMember;
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  });

  /** Parcours en cours visibles par le superviseur (consentement respecté). */
  readonly supervisorInProgress = computed(() => {
    const blocked = this.supervisorBlocked();
    return this.trainingInProgress().filter((request) => !blocked.has(request.employeeId));
  });

  /** Rapports d'évaluation visibles par le superviseur (consentement respecté). */
  readonly supervisorReports = computed(() => {
    const blocked = this.supervisorBlocked();
    return this.evaluationReports().filter(
      (report) => !blocked.has(this.requestById(report.requestId)?.employeeId ?? ''),
    );
  });

  /** Certificats visibles par le superviseur (consentement respecté). */
  readonly supervisorCertificates = computed(() => {
    const blocked = this.supervisorBlocked();
    return this.certificates().filter((certificate) => !blocked.has(certificate.employeeId));
  });

  /** Suivi agrégé des formations, sans donnée nominative côté RH. */
  readonly followUps = computed<TrainingFollowUp[]>(() => {
    const blocked = this.supervisorBlocked();
    return this.requests()
      .filter((request) => !blocked.has(request.employeeId))
      .map((request) => {
      const program = this.programFor(request.id);
      const progress = this.progressFor(request.id);
      const done = progress?.units.filter((unit) => unit.status === 'DONE').length ?? 0;
      const total = progress?.units.length ?? 0;
      const report = request.evaluationId ? this.reportFor(request.evaluationId) : undefined;
      return {
        id: request.id,
        employee: request.employeeName,
        employeeId: request.employeeId,
        formationTitle: program?.title ?? request.skillLabel,
        format: request.format,
        status:
          request.status === 'PENDING'
            ? 'PENDING_APPROVAL'
            : request.status === 'IN_PROGRESS'
              ? 'IN_PROGRESS'
              : request.status === 'COMPLETED'
                ? report?.decision === 'ECHOUE'
                  ? 'FAILED'
                  : 'COMPLETED'
                : 'NOT_STARTED',
        progress: request.progressPercent,
        unitsDone: done,
        unitsTotal: total,
        minutesSpent: progress?.minutesSpent ?? 0,
        lastEvaluation: report?.score,
        updatedAt: progress?.lastActivityAt ?? request.requestedAt,
      } satisfies TrainingFollowUp;
      });
  });

  /* ---------------------------------------------------------------- *
   * Actions — chaque domaine reste maître de sa règle
   * ---------------------------------------------------------------- */

  generateTrainingForGap(gapId: string, format?: TrainingFormat): TrainingRequest | undefined {
    const employeeId = this.profileService.employeeId();
    const gap = this.gapService.byId(gapId, employeeId);
    if (!gap || !employeeId) {
      return undefined;
    }
    return this.trainingService.generateForGap({ gap, format });
  }

  approveTraining(requestId: string, note: string): void {
    this.trainingService.approve(requestId, note);
  }

  rejectTraining(requestId: string, reason: string): void {
    this.trainingService.reject(requestId, reason);
  }

  modifyTraining(input: {
    requestId: string;
    note: string;
    removedUnitIds: string[];
    adjustedHours?: number;
  }): void {
    this.trainingService.requestChanges(input);
  }

  startTraining(requestId: string): void {
    if (this.myRequestById(requestId)) {
      this.trainingService.start(requestId);
    }
  }

  completeTrainingUnit(
    requestId: string,
    unitId: string,
    minutes?: number,
  ): { ok: boolean; message: string } {
    if (!this.myRequestById(requestId)) {
      return { ok: false, message: 'Parcours introuvable dans votre espace.' };
    }
    return this.trainingService.completeUnit(requestId, unitId, { minutes });
  }

  /** Transmet la preuve d'une étape à l'agent d'analyse et renvoie son verdict. */
  verifyTrainingStep(input: {
    requestId: string;
    unitId: string;
    unitTitle: string;
    format: TrainingFormat;
    notions: string[];
    evidence: StepEvidence;
    employeeId?: string;
  }): StepVerification {
    const request = this.myRequestById(input.requestId);
    if (!request) {
      throw new Error('Parcours introuvable dans votre espace.');
    }
    return this.stepVerificationService.verify({ ...input, employeeId: request.employeeId });
  }

  stepVerifications(requestId: string): StepVerification[] {
    const employeeId = this.profileService.employeeId();
    return this.stepVerificationService.forRequestFor(requestId, employeeId);
  }

  lastStepVerification(requestId: string, unitId: string): StepVerification | undefined {
    return this.stepVerifications(requestId).find((item) => item.unitId === unitId);
  }

  saveTrainingNotes(requestId: string, unitId: string, notes: string): void {
    if (this.myRequestById(requestId)) {
      this.trainingService.saveNotes(requestId, unitId, notes);
    }
  }

  submitCapstone(requestId: string, proof: string): { ok: boolean; message: string } {
    if (!this.myRequestById(requestId)) {
      return { ok: false, message: 'Parcours introuvable dans votre espace.' };
    }
    return this.trainingService.submitCapstone(requestId, proof);
  }

  completeTraining(requestId: string): { ok: boolean; message: string } {
    if (!this.myRequestById(requestId)) {
      return { ok: false, message: 'Parcours introuvable dans votre espace.' };
    }
    return this.trainingService.complete(requestId);
  }

  completionState(requestId: string): { ready: boolean; missing: string[]; missingUnits: string[] } {
    if (!this.myRequestById(requestId)) {
      return { ready: false, missing: ['Parcours introuvable'], missingUnits: [] };
    }
    return this.trainingService.completionState(requestId);
  }

  openEvaluation(requestId: string, method: EvaluationMethod): { ok: boolean; message: string } {
    if (!this.myRequestById(requestId)) {
      return { ok: false, message: 'Formation introuvable dans votre espace.' };
    }
    return this.evaluationService.open(requestId, method);
  }

  /** Nombre de tentatives d'évaluation déjà faites sur cette formation. */
  evaluationAttempts(requestId: string): number {
    return this.myRequestById(requestId)
      ? this.evaluationService.attempts(requestId)
      : 0;
  }

  startEvaluation(requestId: string): void {
    if (this.myRequestById(requestId)) {
      this.evaluationService.start(requestId);
    }
  }

  saveEvaluationAnswers(requestId: string, answers: EvaluationAnswers): void {
    if (this.myRequestById(requestId)) {
      this.evaluationService.saveAnswers(requestId, answers);
    }
  }

  /** Brouillon de réponses en cours de passation (conservé à la navigation). */
  evaluationDraft(evaluationId: string): EvaluationAnswers {
    const evaluation = this.myEvaluationById(evaluationId);
    return evaluation ? this.evaluationService.draft(evaluationId) : {};
  }

  saveEvaluationDraft(evaluationId: string, answers: EvaluationAnswers): void {
    if (this.myEvaluationById(evaluationId)) {
      this.evaluationService.saveDraft(evaluationId, answers);
    }
  }

  submitEvaluation(requestId: string, answers: EvaluationAnswers): EvaluationReport | undefined {
    if (!this.myRequestById(requestId)) {
      return undefined;
    }
    return this.evaluationService.submit(requestId, answers);
  }

  finalizeEvaluation(evaluationId: string) {
    if (!this.myEvaluationById(evaluationId)) {
      return { outcome: 'UNKNOWN' as const };
    }
    return this.certificationService.finalize(evaluationId);
  }

  runDailyCollection(options: { simulateFailure?: boolean } = {}): CollectionRun {
    return this.collectionService.runDailyCollection(options);
  }

  retryCollection(): CollectionRun {
    return this.collectionService.retryLastFailure();
  }

  promoteSignal(signalId: string): { ok: boolean; message: string } {
    return this.techWatchService.promote(signalId);
  }

  dismissSignal(signalId: string): void {
    this.techWatchService.dismiss(signalId);
  }

  markNotificationRead(id: string): void {
    this.notificationService.markRead(id);
  }

  markAllNotificationsRead(): void {
    const role = this.auth.role();
    if (role) {
      this.notificationService.markAllRead(role, this.profileService.employeeId());
    }
  }

  saveProfile(profile: OnboardingProfile): void {
    this.profileService.saveProfile(profile);
  }

  updateProfile(patch: Partial<OnboardingProfile>): void {
    this.profileService.updateProfile(patch);
  }

  setDemoMode(value: boolean): void {
    this.workflow.setDemoMode(value);
  }

  /**
   * Rétablit l'ensemble des données de démonstration. La session et les
   * comptes créés sur ce navigateur sont conservés.
   */
  resetDemo(): void {
    this.profileService.reset();
    this.gapService.reset();
    this.collectionService.reset();
    this.techWatchService.reset();
    this.trainingService.reset();
    this.evaluationService.reset();
    this.certificationService.reset();
    this.notificationService.reset();
    this.stepVerificationService.reset();
    this.workflow.reset();
    this.auditService.reset();
    this.demoState.clear();
  }

  /** Efface uniquement l'espace du collaborateur connecté. */
  resetEmployeeWorkspace(employeeId = this.profileService.employeeId()): void {
    if (!employeeId) {
      return;
    }
    this.profileService.clearEmployee(employeeId);
    this.gapService.clearEmployee(employeeId);
    this.collectionService.clearEmployee(employeeId);
    this.techWatchService.clearEmployee(employeeId);
    this.trainingService.clearEmployee(employeeId);
    this.evaluationService.clearEmployee(employeeId);
    this.certificationService.clearEmployee(employeeId);
    this.notificationService.clearEmployee(employeeId);
    this.stepVerificationService.clearEmployee(employeeId);
    this.workflow.clearEmployee(employeeId);
  }

  /** Utilisé par les graphiques de pilotage. */
  readonly kpiByCode = computed<Record<string, Kpi>>(() =>
    Object.fromEntries(this.kpis.map((kpi) => [kpi.code, kpi])),
  );
}
