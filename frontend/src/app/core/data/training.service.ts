import { computed, inject, Injectable, signal } from '@angular/core';
import {
  EvidenceRef,
  FORMAT_LABELS,
  SkillGap,
  TrainingFormat,
  TrainingProgram,
  TrainingProgress,
  TrainingRequest,
  UnitProgress,
} from '../models';
import { AuditService } from './audit.service';
import { CollectionService } from './collection.service';
import { GapService } from './gap.service';
import { knowledgeFor } from './knowledge';
import { INITIAL_TRAINING_REQUESTS } from './mock-data';
import { NotificationService } from './notification.service';
import { ProfileService } from './profile.service';
import { StepVerificationService } from './step-verification.service';
import { buildProgram } from './training/builders';
import { BuildContext, capstoneOf, isoTimestamp, programUnits } from './training/helpers';
import { WorkflowStateService } from './workflow-state.service';
import { AuthService } from '../auth/auth.service';

/**
 * Domaine Formation.
 *
 * Règle structurante (CDC §5.X) : le parcours COMPLET est généré AVANT la
 * validation du superviseur. Celui-ci voit tout le curriculum — unités,
 * plan d'étude, critères de fin, évaluation recommandée — et peut approuver,
 * modifier réellement ou rejeter avec un motif horodaté.
 *
 * La formation ne contient aucune évaluation : elle produit une preuve de
 * fin, puis le domaine Évaluation prend le relais.
 */
@Injectable({ providedIn: 'root' })
export class TrainingService {
  private readonly profileService = inject(ProfileService);
  private readonly gapService = inject(GapService);
  private readonly collection = inject(CollectionService);
  private readonly notifications = inject(NotificationService);
  private readonly audit = inject(AuditService);
  private readonly workflow = inject(WorkflowStateService);
  private readonly stepVerification = inject(StepVerificationService);
  private readonly auth = inject(AuthService);

  /**
   * Acteur humain d'une décision de supervision.
   *
   * Le journal d'audit attribue la décision à l'utilisateur authentifié :
   * un nom figé attribuerait la décision à quelqu'un qui ne l'a pas prise.
   */
  private decisionActor(): string {
    return this.auth.user()?.name ?? 'Superviseur';
  }

  private readonly _requests = signal<TrainingRequest[]>([...INITIAL_TRAINING_REQUESTS]);
  private readonly _programs = signal<TrainingProgram[]>([]);
  private readonly _progresses = signal<TrainingProgress[]>([]);

  readonly requests = this._requests.asReadonly();
  readonly programs = this._programs.asReadonly();
  readonly progresses = this._progresses.asReadonly();

  readonly pending = computed(() =>
    this._requests().filter((request) => request.status === 'PENDING'),
  );

  readonly inProgress = computed(() =>
    this._requests().filter((request) => request.status === 'IN_PROGRESS'),
  );

  readonly completed = computed(() =>
    this._requests().filter((request) => request.status === 'COMPLETED'),
  );

  constructor() {
    // Génère le curriculum des demandes de démonstration avant toute validation.
    for (const request of INITIAL_TRAINING_REQUESTS) {
      if (this.programFor(request.id)) {
        continue;
      }
      const program = this.build(request);
      this._programs.update((programs) => [...programs, program]);
      this._progresses.update((progresses) => [
        ...progresses,
        this.initProgress(request.id, program),
      ]);
      this.patchRequest(request.id, { trainingId: program.id });
    }
  }

  /* ---------------------------------------------------------------- *
   * Lecture
   * ---------------------------------------------------------------- */

  requestById(id: string): TrainingRequest | undefined {
    return this._requests().find((request) => request.id === id);
  }

  programFor(requestId: string): TrainingProgram | undefined {
    return this._programs().find((program) => program.requestId === requestId);
  }

  programById(programId: string): TrainingProgram | undefined {
    return this._programs().find((program) => program.id === programId);
  }

  progressFor(requestId: string): TrainingProgress | undefined {
    return this._progresses().find((progress) => progress.requestId === requestId);
  }

  progressById(programId: string): TrainingProgress | undefined {
    return this._progresses().find((progress) => progress.programId === programId);
  }

  requestsFor(employeeId: string): TrainingRequest[] {
    return this._requests().filter((request) => request.employeeId === employeeId);
  }

  activeRequest(): TrainingRequest | undefined {
    const id = this.workflow.activeTrainingRequestId();
    return id ? this.requestById(id) : undefined;
  }

  unitProgress(requestId: string, unitId: string): UnitProgress | undefined {
    return this.progressFor(requestId)?.units.find((unit) => unit.unitId === unitId);
  }

  /** Lie l'évaluation choisie à la demande (appelé par le domaine Évaluation/Certification). */
  attachEvaluation(requestId: string, evaluationId: string): void {
    this.patchRequest(requestId, { evaluationId });
  }

  /** Lie le certificat émis à la demande. */
  attachCertificate(requestId: string, certificateId: string): void {
    this.patchRequest(requestId, { certificateId });
  }

  /* ---------------------------------------------------------------- *
   * Génération (avant validation superviseur)
   * ---------------------------------------------------------------- */

  /**
   * Génère un parcours complet pour un écart et le soumet au superviseur.
   * Le programme est immédiatement disponible en lecture : rien n'est caché.
   */
  generateForGap(input: {
    gap: SkillGap;
    format?: TrainingFormat;
    objective?: string;
  }): TrainingRequest {
    const gap = input.gap;
    const format = input.format ?? gap.recommendedFormats[0] ?? 'PRACTICAL';
    const profile = this.profileService.profile();
    const requestId = `treq-${Date.now()}`;
    const request: TrainingRequest = {
      id: requestId,
      employeeId: this.profileService.employeeId(),
      employeeName: this.profileService.fullName(),
      gapId: gap.id,
      skillCode: gap.skillCode,
      skillLabel: gap.skillLabel,
      subject: this.subjectFor(gap),
      objective:
        input.objective ??
        `Combler l’écart ${gap.skillLabel} : passer de ${gap.currentLevel} à ${gap.targetLevel}/100 sur les gestes attendus au poste.`,
      domain: profile.domain,
      format,
      levelFrom: gap.currentLevel,
      levelTo: gap.targetLevel,
      status: 'PENDING',
      requestedAt: isoTimestamp(),
      trainingId: '',
      progressPercent: 0,
      origin: 'GAP',
    };

    const program = this.build(request);
    this._requests.update((requests) => [request, ...requests]);
    this._programs.update((programs) => [program, ...programs]);
    this._progresses.update((progresses) => [
      ...progresses,
      this.initProgress(requestId, program),
    ]);
    this.patchRequest(requestId, { trainingId: program.id });

    if (gap.status !== 'EN_FORMATION') {
      this.gapService.acknowledge(gap.id);
    }

    for (const manager of ['MANAGER', 'EMPLOYEE'] as const) {
      this.notifications.notify({
        type: 'TRAINING_SUBMITTED',
        title: `Parcours généré : ${program.title}`,
        message: `${FORMAT_LABELS[format]} · ${program.estimatedHours} h · ${program.estimatedDays} jours · ${programUnits(program).length} unités. En attente de validation du superviseur.`,
        audience: [manager],
        link: `/app/validations/${requestId}`,
        employeeId: request.employeeId,
      });
    }

    this.audit.log({
      actor: 'Learning Planner Agent',
      action: 'Génération de parcours',
      target: requestId,
      detail: `${program.title} — ${FORMAT_LABELS[format]}, ${program.estimatedHours} h, ${programUnits(program).length} unités, généré avant validation.`,
    });

    return this.requestById(requestId) ?? request;
  }

  /** Nouvelle tentative après rejet : nouveau parcours, même écart. */
  regenerate(requestId: string, format: TrainingFormat, note: string): TrainingRequest | undefined {
    const existing = this.requestById(requestId);
    if (!existing) {
      return undefined;
    }
    const gap = this.gapService.byId(existing.gapId);
    if (!gap) {
      return undefined;
    }
    const replacement = this.generateForGap({
      gap,
      format,
      objective: note || existing.objective,
    });
    this.patchRequest(requestId, { status: 'CANCELLED' });
    return replacement;
  }

  /* ---------------------------------------------------------------- *
   * Décision du superviseur
   * ---------------------------------------------------------------- */

  approve(requestId: string, note: string): void {
    const request = this.requestById(requestId);
    if (!request || request.status !== 'PENDING') {
      return;
    }
    this.patchRequest(requestId, {
      status: 'APPROVED',
      decidedAt: isoTimestamp(),
      supervisorNote: note || 'Parcours approuvé après revue du curriculum complet.',
    });

    this.notifications.notify({
      type: 'TRAINING_APPROVED',
      title: `Parcours approuvé : ${request.skillLabel}`,
      message: `${this.programFor(requestId)?.title ?? request.skillLabel} est prêt. Vous pouvez démarrer quand vous le souhaitez.`,
      audience: ['EMPLOYEE'],
      link: `/app/formations/${requestId}`,
      employeeId: request.employeeId,
    });

    this.audit.log({
      actor: this.decisionActor(),
      action: 'Validation de parcours',
      target: requestId,
      detail: note || 'Curriculum complet approuvé.',
    });
  }

  reject(requestId: string, reason: string): void {
    const request = this.requestById(requestId);
    if (!request || request.status !== 'PENDING') {
      return;
    }
    if (!reason.trim()) {
      return;
    }
    this.patchRequest(requestId, {
      status: 'REJECTED',
      decidedAt: isoTimestamp(),
      supervisorNote: reason.trim(),
    });
    const gap = this.gapService.byId(request.gapId);
    if (gap) {
      this.gapService.reopen(gap.id);
    }

    this.notifications.notify({
      type: 'TRAINING_REJECTED',
      title: `Parcours rejeté : ${request.skillLabel}`,
      message: `Motif : ${reason.trim()}`,
      audience: ['EMPLOYEE'],
      link: `/app/ecarts/${request.gapId}`,
      employeeId: request.employeeId,
    });

    this.audit.log({
      actor: this.decisionActor(),
      action: 'Rejet de parcours',
      target: requestId,
      detail: reason.trim(),
    });
  }

  /**
   * Modification réelle : le superviseur retire des unités et/ou ajuste la
   * durée. Le curriculum, le plan d'étude et les critères de fin changent
   * vraiment — ce n'est pas un commentaire.
   */
  requestChanges(input: {
    requestId: string;
    note: string;
    removedUnitIds: string[];
    adjustedHours?: number;
  }): void {
    const request = this.requestById(input.requestId);
    const program = this.programFor(input.requestId);
    if (!request || !program || request.status !== 'PENDING') {
      return;
    }
    if (!input.note.trim()) {
      return;
    }

    const updated = this.applyModification(program, input.removedUnitIds, input.adjustedHours);
    // Un parcours sans aucune unité ne peut pas être suivi ni validé :
    // la modification est refusée plutôt que de produire un curriculum vide.
    if (programUnits(updated).length === 0) {
      this.audit.log({
        actor: this.decisionActor(),
        action: 'Modification refusée',
        target: input.requestId,
        detail: 'Le retrait de toutes les unités est refusé : un parcours doit conserver au moins une unité.',
      });
      return;
    }
    this._programs.update((programs) =>
      programs.map((item) => (item.requestId === input.requestId ? updated : item)),
    );
    this._progresses.update((progresses) =>
      progresses.map((progress) =>
        progress.requestId === input.requestId
          ? this.initProgress(input.requestId, updated)
          : progress,
      ),
    );

    this.patchRequest(input.requestId, {
      status: 'CHANGES_REQUESTED',
      decidedAt: isoTimestamp(),
      supervisorNote: input.note.trim(),
      modification: {
        at: isoTimestamp(),
        note: input.note.trim(),
        removedUnits: input.removedUnitIds,
        adjustedHours: input.adjustedHours,
      },
    });

    this.notifications.notify({
      type: 'CHANGES_REQUESTED',
      title: `Modification demandée : ${request.skillLabel}`,
      message: `${input.removedUnitIds.length} unité(s) retirée(s). Le parcours passe à ${updated.estimatedHours} h. Motif : ${input.note.trim()}`,
      audience: ['EMPLOYEE'],
      link: `/app/formations/${input.requestId}`,
      employeeId: request.employeeId,
    });

    this.audit.log({
      actor: this.decisionActor(),
      action: 'Modification de parcours',
      target: input.requestId,
      detail: `${input.removedUnitIds.length} unité(s) retirée(s), durée ${updated.estimatedHours} h. ${input.note.trim()}`,
    });
  }

  /* ---------------------------------------------------------------- *
   * Exécution de la formation
   * ---------------------------------------------------------------- */

  start(requestId: string): void {
    const request = this.requestById(requestId);
    const program = this.programFor(requestId);
    if (!request || !program) {
      return;
    }
    if (!['APPROVED', 'CHANGES_REQUESTED'].includes(request.status)) {
      return;
    }
    const units = programUnits(program);
    this._progresses.update((progresses) =>
      progresses.map((progress) =>
        progress.requestId === requestId
          ? {
              ...progress,
              startedAt: progress.startedAt ?? isoTimestamp(),
              lastActivityAt: isoTimestamp(),
              units: progress.units.map((unit, index) => ({
                ...unit,
                status: index === 0 ? 'AVAILABLE' : 'LOCKED',
              })),
            }
          : progress,
      ),
    );

    this.patchRequest(requestId, {
      status: 'IN_PROGRESS',
      startedAt: isoTimestamp(),
      decidedAt: request.decidedAt ?? isoTimestamp(),
    });

    this.gapService.markInTraining(request.gapId, requestId);
    this.workflow.setActiveTraining(requestId);

    this.notifications.notify({
      type: 'TRAINING_STARTED',
      title: `Formation démarrée : ${program.title}`,
      message: `${units.length} unités, ${program.estimatedHours} h estimées. La collecte continue pendant la formation.`,
      audience: ['EMPLOYEE', 'MANAGER'],
      link: `/app/formations/${requestId}`,
      employeeId: request.employeeId,
    });

    this.audit.log({
      actor: 'Training Agent',
      action: 'Démarrage de formation',
      target: requestId,
      detail: `${program.title} démarré, ${units.length} unités à réaliser.`,
    });
  }

  /**
   * Parcours suspendu ?
   *
   * Le retrait du consentement de collecte prend effet immédiatement (CDC
   * §12) : le diagnostic et le parcours en cours sont suspendus, sans être
   * supprimés. La collecte, elle, continue de tourner pour la plateforme —
   * c'est l'usage des données de l'employé qui est coupé, pas l'agent.
   */
  private trainingSuspended(): boolean {
    return !this.profileService.profile().consent.collect;
  }

  /** Termine une unité. Les minutes créditées correspondent à la durée de
   * curriculum de l'unité : le temps réel passé à l'écran est transmis à
   * l'agent d'analyse des preuves (contrôle de cohérence temporelle), mais
   * il ne conditionne jamais seul la fin du parcours.
   *
   * Une unité ne peut être terminée que si l'agent d'analyse des preuves a
   * validé la preuve de cette étape : cocher une case ne suffit pas.
   */
  completeUnit(
    requestId: string,
    unitId: string,
    options: { minutes?: number; checkpointPassed?: boolean; notes?: string } = {},
  ): { ok: boolean; message: string } {
    const request = this.requestById(requestId);
    const program = this.programFor(requestId);
    const progress = this.progressFor(requestId);
    if (!request || !program || !progress || request.status !== 'IN_PROGRESS') {
      return { ok: false, message: 'Parcours non démarré.' };
    }
    if (this.trainingSuspended()) {
      return {
        ok: false,
        message:
          'Consentement de collecte retiré : le parcours est suspendu. Rétablissez votre consentement pour le reprendre.',
      };
    }

    const units = programUnits(program);
    const index = progress.units.findIndex((unit) => unit.unitId === unitId);
    if (index < 0) {
      return { ok: false, message: 'Unité introuvable.' };
    }
    const unit = progress.units[index];
    if (unit.status === 'DONE') {
      return { ok: true, message: 'Unité déjà terminée.' };
    }

    const verification = this.stepVerification.lastFor(requestId, unitId);
    if (!verification) {
      return {
        ok: false,
        message:
          'Aucune preuve n’a été transmise pour cette étape : l’agent doit vérifier vos données avant de la valider.',
      };
    }
    if (verification.verdict !== 'VALIDE') {
      return {
        ok: false,
        message:
          verification.verdict === 'REJETE'
            ? 'Étape renvoyée par l’agent : reprenez le travail et transmettez des traces vérifiables.'
            : 'Étape incomplète : complétez la preuve demandée par l’agent, puis relancez la vérification.',
      };
    }
    const definition = units[units.findIndex((item) => item.id === unitId)];
    const credited = options.minutes ?? definition?.minutes ?? 30;

    const updatedUnits = progress.units.map((item, itemIndex) => {
      if (itemIndex === index) {
        return {
          ...item,
          status: 'DONE' as const,
          completedAt: isoTimestamp(),
          minutesSpent: credited,
          checkpointPassed: options.checkpointPassed ?? true,
          notes: options.notes ?? item.notes,
        };
      }
      if (itemIndex === index + 1 && item.status === 'LOCKED') {
        return { ...item, status: 'AVAILABLE' as const };
      }
      return item;
    });

    const minutesSpent = updatedUnits.reduce((sum, item) => sum + item.minutesSpent, 0);
    this._progresses.update((progresses) =>
      progresses.map((item) =>
        item.requestId === requestId
          ? {
              ...item,
              units: updatedUnits,
              minutesSpent,
              lastActivityAt: isoTimestamp(),
            }
          : item,
      ),
    );

    this.syncPercent(requestId);

    const doneCount = updatedUnits.filter((item) => item.status === 'DONE').length;
    if (doneCount === updatedUnits.length) {
      this.notifications.notify({
        type: 'TRAINING_MILESTONE',
        title: 'Toutes les unités sont terminées',
        message: `Il reste la preuve de fin : ${this.capstoneLabel(program)}.`,
        audience: ['EMPLOYEE'],
        link: `/app/formations/${requestId}`,
        employeeId: request.employeeId,
      });
    }

    return {
      ok: true,
      message: `Étape validée par l’agent (${verification.score}/100) : ${definition?.title ?? unitId} terminée.`,
    };
  }

  saveNotes(requestId: string, unitId: string, notes: string): void {
    this._progresses.update((progresses) =>
      progresses.map((progress) =>
        progress.requestId === requestId
          ? {
              ...progress,
              lastActivityAt: isoTimestamp(),
              units: progress.units.map((unit) =>
                unit.unitId === unitId ? { ...unit, notes } : unit,
              ),
            }
          : progress,
      ),
    );
  }

  /** Dépose et valide la preuve de fin. Condition nécessaire pour terminer. */
  submitCapstone(requestId: string, proof: string): { ok: boolean; message: string } {
    const progress = this.progressFor(requestId);
    const program = this.programFor(requestId);
    if (!progress || !program) {
      return { ok: false, message: 'Parcours introuvable.' };
    }
    if (this.trainingSuspended()) {
      return {
        ok: false,
        message:
          'Consentement de collecte retiré : le parcours est suspendu. Rétablissez votre consentement pour le reprendre.',
      };
    }
    if (proof.trim().length < 20) {
      return { ok: false, message: 'La preuve de fin doit être substantielle (20 caractères minimum).' };
    }
    const outcome = this.evaluateCompletion(requestId);
    if (outcome.missingUnits.length > 0) {
      return {
        ok: false,
        message: `Il reste ${outcome.missingUnits.length} unité(s) à terminer avant de déposer la preuve de fin.`,
      };
    }

    this._progresses.update((progresses) =>
      progresses.map((item) =>
        item.requestId === requestId
          ? {
              ...item,
              capstoneSubmitted: true,
              capstoneValidated: true,
              capstoneProof: proof.trim(),
              lastActivityAt: isoTimestamp(),
            }
          : item,
      ),
    );

    this.audit.log({
      actor: 'Training Agent',
      action: 'Preuve de fin déposée',
      target: requestId,
      detail: `${this.capstoneLabel(program)} — ${proof.trim().slice(0, 120)}`,
    });

    return { ok: true, message: 'Preuve de fin déposée et validée.' };
  }

  completionState(requestId: string): {
    ready: boolean;
    missing: string[];
    missingUnits: string[];
  } {
    const outcome = this.evaluateCompletion(requestId);
    return {
      ready: outcome.missing.length === 0,
      missing: outcome.missing,
      missingUnits: outcome.missingUnits,
    };
  }

  /** Clôture la formation et réinjecte TRAINING_COMPLETION dans la collecte. */
  complete(requestId: string): { ok: boolean; message: string } {
    const request = this.requestById(requestId);
    const program = this.programFor(requestId);
    const progress = this.progressFor(requestId);
    if (!request || !program || !progress) {
      return { ok: false, message: 'Parcours introuvable.' };
    }
    const outcome = this.evaluateCompletion(requestId);
    if (outcome.missing.length > 0) {
      return { ok: false, message: `Conditions non remplies : ${outcome.missing.join(' · ')}` };
    }

    this._progresses.update((progresses) =>
      progresses.map((item) =>
        item.requestId === requestId
          ? { ...item, completedAt: isoTimestamp(), masterGatePassed: true }
          : item,
      ),
    );
    this.patchRequest(requestId, {
      status: 'COMPLETED',
      completedAt: isoTimestamp(),
      progressPercent: 100,
    });

    this.collection.recordTrainingCompletion({
      requestId,
      programTitle: program.title,
      skillCode: request.skillCode,
      skillLabel: request.skillLabel,
      levelFrom: program.levelFrom,
      levelTo: program.levelTo,
      minutesSpent: progress.minutesSpent,
      unitsDone: progress.units.filter((unit) => unit.status === 'DONE').length,
      proof: progress.capstoneProof ?? this.capstoneDeliverable(program),
    });

    this.workflow.setActiveTraining(null);
    this.notifyQueuedGaps();

    this.notifications.notify({
      type: 'TRAINING_COMPLETED',
      title: `Formation terminée : ${request.skillLabel}`,
      message:
        'Votre preuve de fin est enregistrée. Choisissez maintenant votre méthode d’évaluation parmi les cinq disponibles.',
      audience: ['EMPLOYEE', 'MANAGER'],
      link: `/app/evaluations/${requestId}`,
      employeeId: request.employeeId,
    });

    this.audit.log({
      actor: 'Training Agent',
      action: 'Fin de formation',
      target: requestId,
      detail: `${program.title} terminé — ${progress.units.length} unités, ${Math.round(progress.minutesSpent / 60)} h, preuve déposée.`,
    });

    return { ok: true, message: 'Formation terminée. L’évaluation est disponible.' };
  }

  /**
   * Clôture les remédiations encore ouvertes sur un écart.
   *
   * Lorsqu'un certificat est délivré après une reprise, le parcours de
   * remédiation devenu inutile est fermé : le superviseur n'a plus à
   * l'approuver. La demande d'origine n'est jamais touchée.
   */
  closeRemediationsFor(gapId: string, reason: string): TrainingRequest[] {
    const open = this._requests().filter(
      (request) =>
        request.gapId === gapId &&
        request.origin === 'REMEDIATION' &&
        (request.status === 'PENDING' || request.status === 'APPROVED'),
    );
    for (const request of open) {
      this.patchRequest(request.id, {
        status: 'CANCELLED',
        decidedAt: isoTimestamp(),
        supervisorNote: reason,
      });
      this.audit.log({
        actor: 'Assessment & Certification Agent',
        action: 'Remédiation close',
        target: request.id,
        detail: reason,
      });
    }
    return open;
  }

  /* ---------------------------------------------------------------- *
   * Remédiation (créée par le domaine Certification après échec)
   * ---------------------------------------------------------------- */

  createRemediation(input: {
    previousRequestId: string;
    skillCode: string;
    skillLabel: string;
    subject: string;
    gapId: string;
    levelFrom: number;
    levelTo: number;
    format: TrainingFormat;
    reason: string;
  }): TrainingRequest | undefined {
    const gap = this.gapService.byId(input.gapId);
    if (!gap) {
      return undefined;
    }
    const request = this.generateForGap({
      gap,
      format: input.format,
      objective: `Remédiation ciblée : ${input.reason} Objectif : repasser de ${input.levelFrom} à ${input.levelTo}/100 sur ${input.skillLabel}.`,
    });
    this.patchRequest(request.id, {
      origin: 'REMEDIATION',
      remediationOf: input.previousRequestId,
    });
    this.notifications.notify({
      type: 'REMEDIATION_CREATED',
      title: `Remédiation créée : ${input.skillLabel}`,
      message: `${input.reason} Un nouveau parcours ${FORMAT_LABELS[input.format].toLowerCase()} a été généré et soumis au superviseur.`,
      audience: ['EMPLOYEE', 'MANAGER'],
      link: `/app/validations/${request.id}`,
      employeeId: request.employeeId,
    });
    return request;
  }

  /* ---------------------------------------------------------------- *
   * Interne
   * ---------------------------------------------------------------- */

  private build(request: TrainingRequest): TrainingProgram {
    const profile = this.profileService.profile();
    const context: BuildContext = {
      requestId: request.id,
      format: request.format,
      skillCode: request.skillCode,
      skillLabel: request.skillLabel,
      subject: request.subject,
      domain: request.domain,
      levelFrom: request.levelFrom,
      levelTo: request.levelTo,
      weeklyHours: profile.weeklyHours,
    };
    const pack = knowledgeFor(
      request.skillCode,
      request.skillLabel,
      request.subject,
      request.domain,
    );
    return buildProgram(context, pack);
  }

  private initProgress(requestId: string, program: TrainingProgram): TrainingProgress {
    const units = programUnits(program);
    return {
      requestId,
      programId: program.id,
      units: units.map((unit) => ({ unitId: unit.id, status: 'LOCKED', minutesSpent: 0 })),
      capstoneSubmitted: false,
      capstoneValidated: false,
      minutesSpent: 0,
      masterGatePassed: false,
    };
  }

  private evaluateCompletion(requestId: string): {
    missing: string[];
    missingUnits: string[];
  } {
    const program = this.programFor(requestId);
    const progress = this.progressFor(requestId);
    const missing: string[] = [];
    if (!program || !progress) {
      return { missing: ['Parcours introuvable'], missingUnits: [] };
    }
    const missingUnits = progress.units
      .filter((unit) => unit.status !== 'DONE')
      .map((unit) => unit.unitId);
    if (missingUnits.length > 0) {
      missing.push(`${missingUnits.length} unité(s) non terminée(s)`);
    }
    const criteria = program.completion;
    if (criteria.requireAllCheckpoints) {
      const failedCheckpoints = progress.units.filter(
        (unit) => unit.status === 'DONE' && unit.checkpointPassed === false,
      );
      if (failedCheckpoints.length > 0) {
        missing.push(`${failedCheckpoints.length} checkpoint(s) formatif(s) non validé(s)`);
      }
    }
    if (progress.minutesSpent < criteria.minMinutes) {
      const missingMinutes = criteria.minMinutes - progress.minutesSpent;
      missing.push(`${Math.ceil(missingMinutes / 60)} h de travail encore à fournir`);
    }
    if (criteria.requireCapstone && !progress.capstoneValidated) {
      missing.push(`preuve de fin non déposée (${criteria.evidenceLabel})`);
    }
    return { missing, missingUnits };
  }

  private applyModification(
    program: TrainingProgram,
    removedUnitIds: string[],
    adjustedHours?: number,
  ): TrainingProgram {
    if (removedUnitIds.length === 0 && !adjustedHours) {
      return program;
    }
    const updated = this.filterUnits(program, removedUnitIds);
    const remaining = programUnits(updated);
    let minutes = remaining.reduce((sum, unit) => sum + unit.minutes, 0);
    let scaled = updated;

    // Volume ajusté par le superviseur : la durée est redistribuée sur les
    // unités réellement conservées. Sans cette redistribution, la condition
    // de fin (minMinutes) pourrait dépasser le temps que le parcours permet
    // de créditer — le parcours deviendrait impossible à terminer.
    if (adjustedHours && adjustedHours > 0) {
      const target = Math.max(Math.round(adjustedHours * 60), remaining.length);
      scaled = this.scaleUnits(updated, target);
      minutes = programUnits(scaled).reduce((sum, unit) => sum + unit.minutes, 0);
    }

    const hours = Math.round((minutes / 60) * 10) / 10;
    return {
      ...scaled,
      estimatedHours: hours,
      estimatedDays: Math.max(2, Math.round(hours / 2)),
      studyPlan: scaled.studyPlan.slice(0, Math.max(3, remaining.length)),
      completion: {
        ...scaled.completion,
        requiredUnits: remaining.length,
        minMinutes: minutes,
      },
    } as TrainingProgram;
  }

  /**
   * Redistribue une durée cible sur les unités réelles du programme.
   *
   * La somme des minutes unitaires devient exactement la cible : la
   * condition de fin reste toujours atteignable, et la durée affichée au
   * superviseur reste celle qui est réellement créditée.
   */
  private scaleUnits(program: TrainingProgram, targetMinutes: number): TrainingProgram {
    const units = programUnits(program);
    if (units.length === 0) {
      return program;
    }
    const total = units.reduce((sum, unit) => sum + unit.minutes, 0);
    if (total <= 0) {
      return program;
    }
    const target = Math.max(Math.round(targetMinutes), units.length);
    const raw = units.map((unit) => Math.max(1, Math.floor((unit.minutes / total) * target)));
    let rest = target - raw.reduce((sum, value) => sum + value, 0);
    const scaled = raw.map((value) => {
      if (rest > 0) {
        rest -= 1;
        return value + 1;
      }
      return value;
    });
    const byId = new Map(units.map((unit, index) => [unit.id, scaled[index]]));
    const scale = <T extends { id: string; estimatedMinutes: number }>(items: T[]): T[] =>
      items.map((item) => ({
        ...item,
        estimatedMinutes: byId.get(item.id) ?? item.estimatedMinutes,
      }));
    switch (program.format) {
      case 'MULTIMEDIA':
        return { ...program, episodes: scale(program.episodes) };
      case 'INTERACTIVE':
        return { ...program, drillSets: scale(program.drillSets) };
      case 'PRACTICAL':
        return { ...program, labs: scale(program.labs) };
      case 'PROJECT':
        return { ...program, milestones: scale(program.milestones) };
      case 'SIMULATION':
        return { ...program, scenarios: scale(program.scenarios) };
      case 'AI_TUTORED':
        return { ...program, tutorSessions: scale(program.tutorSessions) };
      case 'COLLABORATIVE':
        return { ...program, sprints: scale(program.sprints) };
      default:
        return program;
    }
  }

  private filterUnits(program: TrainingProgram, removed: string[]): TrainingProgram {
    const keep = <T extends { id: string }>(items: T[]): T[] =>
      items.filter((item) => !removed.includes(item.id));
    switch (program.format) {
      case 'MULTIMEDIA':
        return { ...program, episodes: keep(program.episodes) };
      case 'INTERACTIVE':
        return { ...program, drillSets: keep(program.drillSets) };
      case 'PRACTICAL':
        return { ...program, labs: keep(program.labs) };
      case 'PROJECT':
        return { ...program, milestones: keep(program.milestones) };
      case 'SIMULATION':
        return { ...program, scenarios: keep(program.scenarios) };
      case 'AI_TUTORED':
        return { ...program, tutorSessions: keep(program.tutorSessions) };
      case 'COLLABORATIVE':
        return { ...program, sprints: keep(program.sprints) };
      default:
        return program;
    }
  }

  private syncPercent(requestId: string): void {
    const progress = this.progressFor(requestId);
    if (!progress) {
      return;
    }
    const done = progress.units.filter((unit) => unit.status === 'DONE').length;
    const total = progress.units.length || 1;
    const percent = Math.round((done / total) * 100);
    this.patchRequest(requestId, { progressPercent: percent });
  }

  private patchRequest(id: string, patch: Partial<TrainingRequest>): void {
    this._requests.update((requests) =>
      requests.map((request) => (request.id === id ? { ...request, ...patch } : request)),
    );
  }

  private notifyQueuedGaps(): void {
    for (const gap of this.gapService.queued()) {
      this.notifications.notify({
        type: 'GAP_DETECTED',
        title: `Écart désormais actionnable : ${gap.skillLabel}`,
        message: `Votre formation est terminée. L’écart ${gap.skillLabel} (${gap.currentLevel}/${gap.targetLevel}) peut maintenant être traité.`,
        audience: ['EMPLOYEE'],
        link: `/app/ecarts/${gap.id}`,
        employeeId: this.profileService.employeeId(),
      });
    }
  }

  private subjectFor(gap: SkillGap): string {
    const map: Record<string, string> = {
      docker: 'Conteneurisation d’applications',
      cicd: 'Intégration et livraison continues',
      kubernetes: 'Orchestration de conteneurs',
      angular: 'Applications Angular maintenables',
      tests: 'Stratégie de test et qualité',
      git: 'Travail collaboratif avec Git',
    };
    return map[gap.skillCode] ?? `${gap.skillLabel} appliqué au poste`;
  }

  /** Libellé de la preuve de fin, exposé aux écrans. */
  capstoneLabel(program: TrainingProgram): string {
    return capstoneOf(program).title;
  }

  capstoneDeliverable(program: TrainingProgram): string {
    return capstoneOf(program).deliverable;
  }

  /** Preuve d'écart réutilisable par les écrans de détail. */
  evidenceFor(requestId: string): EvidenceRef | undefined {
    const progress = this.progressFor(requestId);
    const program = this.programFor(requestId);
    if (!progress?.capstoneProof || !program) {
      return undefined;
    }
    return {
      id: `ev-cap-${requestId}`,
      at: progress.completedAt ?? isoTimestamp(),
      source: 'TRAINING_COMPLETION',
      statement: `${program.title} — ${progress.capstoneProof.slice(0, 140)}`,
      observed: true,
      confidence: 0.8,
    };
  }
}
