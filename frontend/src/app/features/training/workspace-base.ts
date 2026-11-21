import {
  computed,
  Directive,
  inject,
  input,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import {
  StepEvidence,
  StepVerification,
  TrainingFormat,
  TrainingProgram,
  TrainingProgress,
  TrainingRequest,
} from '../../core/models';
import { DataService } from '../../core/data/data.service';
import { programUnits } from '../../core/data/training/helpers';

const WORKSPACE_NOTES_MARKER = 'workadapt.training-workspace.notes' as const;
const WORKSPACE_NOTES_VERSION = 1 as const;

interface WorkspaceNotesEnvelope {
  marker: typeof WORKSPACE_NOTES_MARKER;
  version: typeof WORKSPACE_NOTES_VERSION;
  note: string;
  state?: unknown;
}

function isWorkspaceNotesEnvelope(value: unknown): value is WorkspaceNotesEnvelope {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Partial<WorkspaceNotesEnvelope>;
  return (
    candidate.marker === WORKSPACE_NOTES_MARKER &&
    candidate.version === WORKSPACE_NOTES_VERSION &&
    typeof candidate.note === 'string'
  );
}

/**
 * Base commune aux sept espaces de formation.
 *
 * Elle porte l'accès aux données, les unités, la progression, le temps
 * réellement passé sur chaque étape et l'envoi de la preuve à l'agent
 * d'analyse. Chaque format garde son interface, sa progression visuelle et
 * sa preuve de fin.
 */
@Directive()
export abstract class WorkspaceBase implements OnInit, OnDestroy {
  protected readonly data = inject(DataService);

  readonly request = input.required<TrainingRequest>();
  readonly program = input.required<TrainingProgram>();
  readonly progress = input.required<TrainingProgress>();
  readonly editable = input(false);

  readonly selectedUnitId = signal('');
  readonly units = computed(() => programUnits(this.program()));
  readonly activeUnit = computed(() => {
    const units = this.units();
    const selected = this.selectedUnitId();
    return (
      units.find((unit) => unit.id === selected) ??
      units.find((unit) => this.status(unit.id) !== 'DONE') ??
      units[0]
    );
  });
  readonly doneCount = computed(
    () => this.progress().units.filter((unit) => unit.status === 'DONE').length,
  );
  readonly percent = computed(() =>
    this.units().length === 0
      ? 0
      : Math.round((this.doneCount() / this.units().length) * 100),
  );

  /** Notes visibles de l'unité active, communes aux sept formats. */
  readonly notes = signal('');
  /** Dernier verdict de l'agent sur l'unité affichée. */
  readonly verification = signal<StepVerification | undefined>(undefined);
  /** Historique des verdicts, par unité. */
  readonly verifications = computed(() => this.data.stepVerifications(this.request().id));

  private readonly spent = signal<Record<string, number>>({});
  private lastActivityAt = Date.now();
  private timer: ReturnType<typeof setInterval> | undefined;

  /**
   * Le suivi du temps démarre en ngOnInit : les entrées required du
   * composant ne sont disponibles qu'à partir de ce cycle de vie.
   */
  ngOnInit(): void {
    this.timer = setInterval(() => this.trackTime(), 20000);
    // Un parcours déjà terminé reste consultable : on recharge le verdict
    // de l'agent, les notes et les preuves envoyées, étape par étape.
    this.activateUnit(this.activeUnit()?.id ?? '');
  }

  ngOnDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  status(unitId: string): 'LOCKED' | 'AVAILABLE' | 'IN_PROGRESS' | 'DONE' {
    const liveProgress = this.data.progressFor(this.request().id);
    return (
      liveProgress?.units.find((unit) => unit.unitId === unitId)?.status ??
      this.progress().units.find((unit) => unit.unitId === unitId)?.status ??
      'LOCKED'
    );
  }

  isDone(unitId: string): boolean {
    return this.status(unitId) === 'DONE';
  }

  isLocked(unitId: string): boolean {
    return this.status(unitId) === 'LOCKED';
  }

  select(unitId: string): void {
    if (!this.isLocked(unitId)) {
      this.trackTime();
      this.activateUnit(unitId);
    }
  }

  /** Met à jour les notes visibles et les conserve pour l'unité active. */
  setNotes(value: string): void {
    this.notes.set(value);
    const unitId = this.activeUnit()?.id;
    if (unitId) {
      this.persistUnitNotes(unitId, value);
    }
  }

  /** Conserve les notes visibles de l'unité active. */
  saveNotes(): void {
    const unitId = this.activeUnit()?.id;
    if (unitId) {
      this.persistUnitNotes(unitId, this.notes());
    }
  }

  /** Affiche le dernier verdict enregistré par l'agent pour une unité. */
  private showVerdict(unitId: string): void {
    this.verification.set(unitId ? this.verdictFor(unitId) : undefined);
  }

  /**
   * Active une unité et restaure son état visible.
   *
   * Les implémentations-specifics complètent cette méthode via
   * `restoreUnitState` : la sélection et la relecture des notes restent
   * identiques dans les sept formats.
   */
  private activateUnit(unitId: string): void {
    if (!unitId) {
      this.selectedUnitId.set('');
      this.notes.set('');
      this.verification.set(undefined);
      return;
    }
    this.selectedUnitId.set(unitId);
    this.showVerdict(unitId);
    this.notes.set(this.savedNotes(unitId));
    this.restoreUnitState(unitId);
  }

  /**
   * Restaure l'état propre au format d'une unité.
   *
   * Le hook est volontairement vide dans la base : les sept formats
   * l'implémentent sans dupliquer la sélection, les notes ni le verdict.
   */
  protected restoreUnitState(_unitId: string): void {}

  /** Notes déjà enregistrées pour une unité (relecture d'un parcours terminé). */
  protected savedNotes(unitId: string): string {
    const raw = this.rawNotes(unitId);
    const envelope = this.parseEnvelope(raw);
    return envelope?.note ?? raw;
  }

  /** État structuré enregistré pour une unité, s'il existe. */
  protected unitState<T>(unitId: string): T | undefined {
    const envelope = this.parseEnvelope(this.rawNotes(unitId));
    return envelope?.state as T | undefined;
  }

  /**
   * Conserve l'état structuré d'une unité sans perdre sa note visible.
   *
   * `note` permet aux formats multi-champs de conserver leur restitution
   * principale dans le même emplacement que les autres formats.
   */
  protected saveUnitState(unitId: string, state: unknown, note = this.savedNotes(unitId)): void {
    const envelope: WorkspaceNotesEnvelope = {
      marker: WORKSPACE_NOTES_MARKER,
      version: WORKSPACE_NOTES_VERSION,
      note,
      state,
    };
    this.data.saveTrainingNotes(this.request().id, unitId, JSON.stringify(envelope));
    if (this.activeUnit()?.id === unitId) {
      this.notes.set(note);
    }
  }

  private persistUnitNotes(unitId: string, note: string): void {
    const existing = this.parseEnvelope(this.rawNotes(unitId));
    const envelope: WorkspaceNotesEnvelope = {
      marker: WORKSPACE_NOTES_MARKER,
      version: WORKSPACE_NOTES_VERSION,
      note,
      ...(existing?.state === undefined ? {} : { state: existing.state }),
    };
    this.data.saveTrainingNotes(this.request().id, unitId, JSON.stringify(envelope));
  }

  private rawNotes(unitId: string): string {
    const liveProgress = this.data.progressFor(this.request().id);
    return (
      liveProgress?.units.find((unit) => unit.unitId === unitId)?.notes ??
      this.progress().units.find((unit) => unit.unitId === unitId)?.notes ??
      ''
    );
  }

  private parseEnvelope(raw: string): WorkspaceNotesEnvelope | undefined {
    if (!raw) {
      return undefined;
    }
    try {
      const parsed: unknown = JSON.parse(raw);
      return isWorkspaceNotesEnvelope(parsed) ? parsed : undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Temps réellement passé sur une unité, exprimé en minutes « vécues »
   * (le mode démo comprime le temps : ×20).
   */
  protected minutesOn(unitId: string): number {
    const map = this.spent();
    const live =
      this.activeUnit()?.id === unitId ? (Date.now() - this.lastActivityAt) / 60000 : 0;
    const factor = this.data.workflow.demoMode() ? this.data.workflow.timeFactor() : 1;
    return ((map[unitId] ?? 0) + live) * factor;
  }

  /** Verdict de l'agent pour une unité, s'il existe. */
  protected verdictFor(unitId: string): StepVerification | undefined {
    return this.data.lastStepVerification(this.request().id, unitId);
  }

  /**
   * Envoie la preuve de l'étape à l'agent d'analyse des preuves et
   * n'achève l'unité que si le verdict est favorable.
   */
  protected verifyStep(input: {
    unitId: string;
    unitTitle: string;
    format: TrainingFormat;
    notions: string[];
    evidence: StepEvidence;
  }): StepVerification {
    const verification = this.data.verifyTrainingStep({
      requestId: this.request().id,
      unitId: input.unitId,
      unitTitle: input.unitTitle,
      format: input.format,
      notions: input.notions,
      evidence: input.evidence,
      employeeId: this.request().employeeId,
    });
    this.verification.set(verification);
    return verification;
  }

  /**
   * Termine l'unité si et seulement si l'agent a validé la preuve.
   * Retourne le verdict pour que l'espace de formation affiche la décision.
   */
  protected completeValidated(
    unitId: string,
    minutes: number | undefined,
    verification: StepVerification,
  ): boolean {
    if (verification.verdict !== 'VALIDE') {
      return false;
    }
    this.trackTime();
    const outcome = this.data.completeTrainingUnit(this.request().id, unitId, minutes);
    if (!outcome.ok) {
      return false;
    }

    const nextUnitId = this.nextAvailableUnit(unitId);
    if (nextUnitId) {
      this.activateUnit(nextUnitId);
    }
    return true;
  }

  /** Première unité disponible qui suit l'unité terminée. */
  private nextAvailableUnit(completedUnitId: string): string | undefined {
    const units = this.units();
    const completedIndex = units.findIndex((unit) => unit.id === completedUnitId);
    const ordered =
      completedIndex < 0
        ? units
        : [...units.slice(completedIndex + 1), ...units.slice(0, completedIndex)];
    const liveProgress = this.data.progressFor(this.request().id);

    return ordered.find((unit) => {
      const status =
        liveProgress?.units.find((item) => item.unitId === unit.id)?.status ??
        this.progress().units.find((item) => item.unitId === unit.id)?.status;
      return status === 'AVAILABLE' || status === 'IN_PROGRESS';
    })?.id;
  }

  private trackTime(): void {
    const now = Date.now();
    const delta = (now - this.lastActivityAt) / 60000;
    const unitId = this.activeUnit()?.id;
    if (unitId && delta > 0) {
      this.spent.update((map) => ({ ...map, [unitId]: (map[unitId] ?? 0) + delta }));
    }
    this.lastActivityAt = now;
  }
}
