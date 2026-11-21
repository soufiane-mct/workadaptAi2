import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { TrainingFormat } from '../models';
import { DemoStateStore } from './demo-state.store';
import { ProfileService } from './profile.service';

/**
 * État transversal du parcours : formation active, évaluation en cours,
 * mode démonstration et état de la collecte continue.
 *
 * Les états de parcours sont cloisonnés par employé. Le service ne contient
 * aucune logique métier : il évite les dépendances circulaires entre
 * Formation, Évaluation et Collecte.
 */
@Injectable({ providedIn: 'root' })
export class WorkflowStateService {
  private readonly profileService = inject(ProfileService);
  private readonly store = inject(DemoStateStore);

  private readonly _activeTrainingRequestIds = signal<Record<string, string | null>>(
    this.store.read<Record<string, string | null>>('workflow.active-training', {}),
  );
  private readonly _evaluationInProgressByEmployee = signal<Record<string, boolean>>(
    this.store.read<Record<string, boolean>>('workflow.evaluation-in-progress', {}),
  );
  private readonly _demoMode = signal(this.store.read<boolean>('workflow.demo-mode', true));
  private readonly _collectionRunning = signal(false);

  readonly activeTrainingRequestId = computed(() => {
    const employeeId = this.profileService.employeeId();
    return this._activeTrainingRequestIds()[employeeId] ?? null;
  });
  readonly evaluationInProgress = computed(
    () => this._evaluationInProgressByEmployee()[this.profileService.employeeId()] ?? false,
  );
  readonly demoMode = this._demoMode.asReadonly();
  readonly collectionRunning = this._collectionRunning.asReadonly();

  /** Facteur de compression du temps en mode démonstration (jamais > 1 en réel). */
  readonly timeFactor = computed(() => (this._demoMode() ? 20 : 1));

  constructor() {
    effect(() => {
      this.store.write('workflow.active-training', this._activeTrainingRequestIds());
      this.store.write(
        'workflow.evaluation-in-progress',
        this._evaluationInProgressByEmployee(),
      );
      this.store.write('workflow.demo-mode', this._demoMode());
    });
  }

  setActiveTraining(requestId: string | null): void {
    const employeeId = this.profileService.employeeId();
    if (!employeeId) {
      return;
    }
    this._activeTrainingRequestIds.update((items) => ({ ...items, [employeeId]: requestId }));
  }

  hasActiveTraining(): boolean {
    return this.activeTrainingRequestId() !== null;
  }

  setEvaluationInProgress(value: boolean): void {
    const employeeId = this.profileService.employeeId();
    if (!employeeId) {
      return;
    }
    this._evaluationInProgressByEmployee.update((items) => ({ ...items, [employeeId]: value }));
  }

  setDemoMode(value: boolean): void {
    this._demoMode.set(value);
  }

  setCollectionRunning(value: boolean): void {
    this._collectionRunning.set(value);
  }

  /** Convertit des minutes réelles en minutes "vécues" selon le mode démo. */
  accelerate(minutes: number): number {
    return this._demoMode() ? Math.max(1, Math.round(minutes / this.timeFactor())) : minutes;
  }

  clearEmployee(employeeId: string): void {
    this._activeTrainingRequestIds.update((items) => {
      const next = { ...items };
      delete next[employeeId];
      return next;
    });
    this._evaluationInProgressByEmployee.update((items) => {
      const next = { ...items };
      delete next[employeeId];
      return next;
    });
  }

  reset(): void {
    this._activeTrainingRequestIds.set({});
    this._evaluationInProgressByEmployee.set({});
    this._demoMode.set(true);
    this._collectionRunning.set(false);
  }
}

export type Placement = TrainingFormat;
