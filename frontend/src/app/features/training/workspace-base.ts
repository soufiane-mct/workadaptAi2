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
  }

  ngOnDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  status(unitId: string): 'LOCKED' | 'AVAILABLE' | 'IN_PROGRESS' | 'DONE' {
    return this.progress().units.find((unit) => unit.unitId === unitId)?.status ?? 'LOCKED';
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
      this.selectedUnitId.set(unitId);
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
    const outcome = this.data.completeTrainingUnit(this.request().id, unitId, minutes);
    return outcome.ok;
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
