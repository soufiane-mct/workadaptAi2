import { computed, inject, Injectable, signal } from '@angular/core';
import {
  CollectionEvent,
  CollectionEventType,
  CollectionRun,
  CollectionSource,
  DataSource,
  OnboardingProfile,
  SkillGap,
  StepVerdict,
} from '../models';
import { AuditService } from './audit.service';
import { GapService } from './gap.service';
import { NotificationService } from './notification.service';
import { ProfileService } from './profile.service';
import { WorkflowStateService } from './workflow-state.service';
import {
  DATA_SOURCES,
  INITIAL_COLLECTION_EVENTS,
  INITIAL_COLLECTION_RUNS,
} from './mock-data';

interface SimulatedEvent {
  source: CollectionSource;
  type: CollectionEventType;
  label: string;
  detail: string;
  skillCodes: string[];
  observed: boolean;
  confidence: number;
  proof: string;
}

/**
 * Collecte permanente (CDC §6).
 *
 * Elle ne s'arrête jamais : la collecte initiale alimente le premier
 * diagnostic, puis la collecte quotidienne continue pendant les formations
 * et les évaluations. Un écart détecté pendant un cycle actif est mis
 * EN_ATTENTE, jamais ignoré.
 *
 * La fin de formation et le résultat d'évaluation sont réinjectés ici
 * (`TRAINING_COMPLETION`, `EVALUATION_RESULT`) pour recalculer le niveau
 * de compétence et le statut de l'écart.
 */
@Injectable({ providedIn: 'root' })
export class CollectionService {
  private readonly profileService = inject(ProfileService);
  private readonly gapService = inject(GapService);
  private readonly notifications = inject(NotificationService);
  private readonly audit = inject(AuditService);
  private readonly workflow = inject(WorkflowStateService);

  private readonly _events = signal<CollectionEvent[]>(INITIAL_COLLECTION_EVENTS);
  // Journal du plus récent au plus ancien, comme les exécutions ajoutées ensuite.
  private readonly _runs = signal<CollectionRun[]>(
    [...INITIAL_COLLECTION_RUNS].sort((a, b) => b.startedAt.localeCompare(a.startedAt)),
  );
  private readonly _sources = signal<DataSource[]>(DATA_SOURCES);
  private readonly _failed = signal(false);

  readonly events = this._events.asReadonly();
  readonly runs = this._runs.asReadonly();
  readonly sources = this._sources.asReadonly();
  readonly failed = this._failed.asReadonly();

  readonly connectedSources = computed(
    () => this._sources().filter((source) => source.status === 'CONNECTED').length,
  );

  readonly lastRun = computed(() => this._runs()[0]);

  readonly eventCount = computed(() => this._events().length);

  readonly last24h = computed(() => {
    const limit = Date.now() - 24 * 3600 * 1000;
    return this._events().filter((event) => new Date(event.at).getTime() >= limit).length;
  });

  eventsForSkill(code: string): CollectionEvent[] {
    return this._events().filter((event) => event.skillCodes.includes(code));
  }

  bySource(source: CollectionSource): CollectionEvent[] {
    return this._events().filter((event) => event.source === source);
  }

  /** Collecte initiale après l'onboarding : CV, entretien et formations antérieures. */
  runInitialCollection(profile: OnboardingProfile): CollectionRun {
    const events: SimulatedEvent[] = [
      {
        source: 'CV',
        type: 'PROFILE_UPDATE',
        label: `CV analysé — ${profile.cv?.fileName ?? 'document transmis'}`,
        detail: `Extraction de ${profile.cv?.skills.length ?? 0} compétences, ${profile.cv?.experiences.length ?? 0} expériences et ${profile.cv?.certifications.length ?? 0} certification(s).`,
        skillCodes: (profile.cv?.skills ?? ['docker', 'git']).map((skill) => skill.toLowerCase()),
        observed: false,
        confidence: 0.6,
        proof: 'Extraction automatique du CV',
      },
      {
        source: 'INTERVIEW',
        type: 'ASSESSMENT_DONE',
        label: 'Entretien de diagnostic terminé',
        detail: `Domaine ${profile.domain}, poste ${profile.jobTitle}, ${profile.objectives.length} objectif(s) déclaré(s).`,
        skillCodes: ['docker', 'cicd', 'git'],
        observed: false,
        confidence: 0.7,
        proof: 'Transcription de l’entretien IA',
      },
      {
        source: 'PAST_TRAINING',
        type: 'TRAINING_DONE',
        label: `${profile.pastTrainings.length} formation(s) antérieure(s) enregistrée(s)`,
        detail: profile.pastTrainings.map((training) => training.title).join(' · ') || 'Aucune formation déclarée',
        skillCodes: ['git'],
        observed: true,
        confidence: 0.75,
        proof: 'Registre déclaré par l’employé',
      },
    ];

    const created: CollectionEvent[] = events.map((event, index) => this.toEvent(event, index));
    this._events.update((current) => [...created, ...current]);
    this.touchSources(created.map((event) => event.source));

    const gaps = this.gapService.detectFromSkills(
      this.profileService.skills(),
      this.workflow.hasActiveTraining(),
    );

    return this.pushRun('INITIAL', created, gaps, events.map((event) => event.source));
  }

  /**
   * Collecte quotidienne simulée. Elle tourne aussi pendant une formation :
   * les nouveaux écarts sont alors mis en attente.
   */
  runDailyCollection(options: { simulateFailure?: boolean } = {}): CollectionRun {
    this.workflow.setCollectionRunning(true);
    const sources: CollectionSource[] = ['COLLECTOR', 'CONNECTED_APP', 'TECH_WATCH'];

    if (options.simulateFailure) {
      this._failed.set(true);
      this._sources.update((items) =>
        items.map((item) =>
          item.code === 'COLLECTOR' ? { ...item, status: 'PARTIAL' } : item,
        ),
      );
      const run = this.pushRun('DAILY', [], [], sources, {
        status: 'FAILED',
        error: 'Desktop Collector injoignable — l’agent n’a pas répondu dans le délai imparti.',
      });
      this.notifications.notify({
        type: 'COLLECTION_FAILED',
        title: 'Collecte partielle',
        message:
          'Le Desktop Collector n’a pas répondu. Les autres sources ont été conservées ; une reprise est possible.',
        audience: ['EMPLOYEE', 'MANAGER', 'ADMIN'],
        link: '/app/collecte',
      });
      this.audit.log({
        actor: 'Data Collection Agent',
        action: 'Échec de collecte',
        target: run.id,
        detail: 'Desktop Collector injoignable, sources restantes conservées.',
      });
      this.workflow.setCollectionRunning(false);
      return run;
    }

    this._failed.set(false);
    const pool: SimulatedEvent[] = [
      {
        source: 'COLLECTOR',
        type: 'APP_USAGE',
        label: 'Docker Desktop — 45 min de pratique',
        detail: 'Construction d’images locales et tests de conteneurs.',
        skillCodes: ['docker'],
        observed: true,
        confidence: 0.85,
        proof: 'Journal du Desktop Collector · 2 sessions',
      },
      {
        source: 'CONNECTED_APP',
        type: 'PROJECT_ACTIVITY',
        label: 'Pull request mergée sur api-facturation',
        detail: 'Revue effectuée, tests exécutés avant fusion.',
        skillCodes: ['git', 'tests'],
        observed: true,
        confidence: 0.9,
        proof: 'GitHub · pull request #214',
      },
      {
        source: 'TECH_WATCH',
        type: 'TECH_SIGNAL',
        label: 'Signal de veille : Dev Containers',
        detail: 'Technologie en adoption, pertinence haute pour le poste de développeur backend.',
        skillCodes: ['docker'],
        observed: false,
        confidence: 0.6,
        proof: 'Technology Watch Agent · veille interne',
      },
      {
        source: 'CONNECTED_APP',
        type: 'PROJECT_ACTIVITY',
        label: 'Pipeline GitHub Actions encore en échec',
        detail: 'Deux exécutions rouges, aucune correction poussée.',
        skillCodes: ['cicd'],
        observed: true,
        confidence: 0.8,
        proof: 'GitHub Actions · runs 1190 et 1191',
      },
    ];

    const picked = pool.slice(0, 3);
    const created = picked.map((event, index) => this.toEvent(event, index));
    this._events.update((current) => [...created, ...current]);
    this.touchSources(created.map((event) => event.source));

    const gaps = this.gapService.detectFromSkills(
      this.profileService.skills(),
      this.workflow.hasActiveTraining(),
    );

    const run = this.pushRun('DAILY', created, gaps, sources, { status: 'SUCCESS' });

    for (const gap of gaps) {
      this.notifications.notify({
        type: gap.status === 'EN_ATTENTE' ? 'GAP_QUEUED' : 'GAP_DETECTED',
        title:
          gap.status === 'EN_ATTENTE'
            ? `Écart mis en attente : ${gap.skillLabel}`
            : `Nouvel écart détecté : ${gap.skillLabel}`,
        message:
          gap.status === 'EN_ATTENTE'
            ? `${gap.skillLabel} (${gap.currentLevel}/${gap.targetLevel}) a été détecté pendant votre cycle en cours. Il sera actionnable à la fin de la formation.`
            : `${gap.skillLabel} est à ${gap.currentLevel}/100 pour un attendu de ${gap.targetLevel}. Un parcours peut être généré.`,
        audience: ['EMPLOYEE', 'MANAGER'],
        link: `/app/ecarts/${gap.id}`,
        employeeId: 'emp-0001',
      });
    }

    this.audit.log({
      actor: 'Data Collection Agent',
      action: 'Collecte quotidienne',
      target: run.id,
      detail: `${created.length} événement(s), ${gaps.length} nouvel(aux) écart(s).`,
    });

    this.workflow.setCollectionRunning(false);
    return run;
  }

  /** Reprise après échec : ne rejoue que les sources concernées. */
  retryLastFailure(): CollectionRun {
    this._sources.update((items) =>
      items.map((item) => (item.code === 'COLLECTOR' ? { ...item, status: 'CONNECTED' } : item)),
    );
    return this.runDailyCollection();
  }

  /**
   * Réinjection d'un verdict de vérification d'étape : la collecte permanente
   * conserve la trace de ce que l'agent a contrôlé à chaque étape, y compris
   * les étapes renvoyées.
   */
  recordStepVerification(input: {
    requestId: string;
    unitId: string;
    unitTitle: string;
    verdict: StepVerdict;
    score: number;
    gaps: number;
    agent: string;
  }): CollectionEvent {
    const event = this.toEvent(
      {
        source: 'TRAINING_STEP',
        type: 'STEP_VERIFICATION',
        label: `Étape ${input.verdict === 'VALIDE' ? 'validée' : 'renvoyée'} — ${input.unitTitle}`,
        detail:
          input.verdict === 'VALIDE'
            ? `Preuve vérifiée par ${input.agent} (${input.score}/100).`
            : `Preuve insuffisante (${input.score}/100) : ${input.gaps} point(s) bloquant(s) signalés par ${input.agent}.`,
        skillCodes: [],
        observed: true,
        confidence: input.verdict === 'VALIDE' ? 0.88 : 0.7,
        proof: `Vérification d’étape ${input.unitId}`,
      },
      0,
      `sv-${input.requestId}-${input.unitId}`,
    );

    this._events.update((current) => [event, ...current]);
    this.touchSources(['TRAINING_STEP']);
    return event;
  }

  /**
   * Réinjection d'une fin de formation. Le niveau progresse, mais seule
   * l'évaluation pourra prouver la maîtrise : l'écart devient partiellement résolu.
   */
  recordTrainingCompletion(input: {
    requestId: string;
    programTitle: string;
    skillCode: string;
    skillLabel: string;
    levelFrom: number;
    levelTo: number;
    minutesSpent: number;
    unitsDone: number;
    proof: string;
  }): SkillGap[] {
    const progressLevel = Math.round(
      input.levelFrom + (input.levelTo - input.levelFrom) * 0.6,
    );
    const event = this.toEvent(
      {
        source: 'TRAINING_COMPLETION',
        type: 'TRAINING_DONE',
        label: `Formation terminée — ${input.programTitle}`,
        detail: `${input.unitsDone} unité(s) terminée(s), ${Math.round(input.minutesSpent / 60)} h de travail, preuve : ${input.proof.replace(/[.\s]+$/, '')}.`,
        skillCodes: [input.skillCode],
        observed: true,
        confidence: 0.8,
        proof: input.proof,
      },
      0,
      `tc-${input.requestId}`,
    );

    this._events.update((current) => [event, ...current]);
    this.touchSources(['TRAINING_COMPLETION']);

    this.profileService.updateSkillLevel({
      code: input.skillCode,
      level: progressLevel,
      cause: 'FORMATION',
      evidenceIds: [event.id],
      confidence: 0.8,
      source: 'OBSERVED',
    });

    const gaps = this.gapService.detectFromSkills(this.profileService.skills(), false);
    const gap = this.gapService.bySkill(input.skillCode);
    if (gap && gap.status !== 'RESOLU') {
      this.gapService.markPartial(gap.id, progressLevel);
    }

    this.audit.log({
      actor: 'Training Agent',
      action: 'Fin de formation',
      target: input.requestId,
      detail: `${input.programTitle} terminé, niveau ${progressLevel}/100 en attente d’évaluation.`,
    });

    return gaps;
  }

  /**
   * Réinjection d'un résultat d'évaluation : c'est ici que la boucle se ferme
   * (niveau réel + statut de l'écart + notification).
   */
  recordEvaluationResult(input: {
    requestId: string;
    evaluationId: string;
    methodLabel: string;
    skillCode: string;
    skillLabel: string;
    levelAfter: number;
    passed: boolean;
    score: number;
    note: string;
  }): SkillGap[] {
    const event = this.toEvent(
      {
        source: 'EVALUATION_RESULT',
        type: 'ASSESSMENT_DONE',
        label: `Évaluation ${input.passed ? 'réussie' : 'échouée'} — ${input.methodLabel}`,
        detail: `Score ${input.score}/100. ${input.note}`,
        skillCodes: [input.skillCode],
        observed: true,
        confidence: 0.95,
        proof: `Rapport d’évaluation ${input.evaluationId}`,
      },
      0,
      `er-${input.evaluationId}`,
    );

    this._events.update((current) => [event, ...current]);
    this.touchSources(['EVALUATION_RESULT']);

    this.profileService.updateSkillLevel({
      code: input.skillCode,
      level: input.levelAfter,
      cause: 'EVALUATION',
      evidenceIds: [event.id],
      confidence: 0.95,
      source: input.passed ? 'CERTIFIED' : 'ASSESSED',
    });

    const gaps = this.gapService.detectFromSkills(this.profileService.skills(), false);
    const gap = this.gapService.bySkill(input.skillCode);
    if (gap) {
      if (gap.targetLevel - input.levelAfter <= 0) {
        this.gapService.markResolved(gap.id, input.levelAfter);
      } else if (!input.passed) {
        this.gapService.markStillOpen(
          gap.id,
          input.levelAfter,
          'Évaluation non réussie : une remédiation est nécessaire avant un nouveau passage.',
        );
      } else {
        this.gapService.markPartial(gap.id, input.levelAfter);
      }
    }

    return gaps;
  }

  private toEvent(event: SimulatedEvent, index: number, prefix = 'evt'): CollectionEvent {
    return {
      id: `${prefix}-${Date.now()}-${index}`,
      at: new Date().toISOString(),
      ...event,
    };
  }

  private touchSources(sources: CollectionSource[]): void {
    const unique = Array.from(new Set(sources));
    this._sources.update((items) =>
      items.map((item) =>
        unique.includes(item.code)
          ? { ...item, lastSync: new Date().toISOString(), records: (item.records ?? 0) + 1 }
          : item,
      ),
    );
  }

  private pushRun(
    kind: CollectionRun['kind'],
    events: CollectionEvent[],
    gaps: SkillGap[],
    sources: CollectionSource[],
    extra: { status?: CollectionRun['status']; error?: string } = {},
  ): CollectionRun {
    const run: CollectionRun = {
      id: `run-${Date.now()}`,
      kind,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      eventsCount: events.length,
      newGaps: gaps.length,
      status: extra.status ?? 'SUCCESS',
      error: extra.error,
      sourcesUsed: sources,
    };
    this._runs.update((runs) => [run, ...runs].slice(0, 40));
    return run;
  }
}
