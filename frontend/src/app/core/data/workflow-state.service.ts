import { computed, Injectable, signal } from '@angular/core';
import { TrainingFormat } from '../models';

/**
 * État transversal du parcours : formation active, évaluation en cours,
 * mode démonstration et état de la collecte continue.
 *
 * Ce service ne contient aucune logique métier : il évite simplement les
 * dépendances circulaires entre Formation, Évaluation et Collecte.
 */
@Injectable({ providedIn: 'root' })
export class WorkflowStateService {
  private readonly _activeTrainingRequestId = signal<string | null>(null);
  private readonly _evaluationInProgress = signal(false);
  private readonly _demoMode = signal(true);
  private readonly _collectionRunning = signal(false);

  readonly activeTrainingRequestId = this._activeTrainingRequestId.asReadonly();
  readonly evaluationInProgress = this._evaluationInProgress.asReadonly();
  readonly demoMode = this._demoMode.asReadonly();
  readonly collectionRunning = this._collectionRunning.asReadonly();

  /** Facteur de compression du temps en mode démonstration (jamais > 1 en réel). */
  readonly timeFactor = computed(() => (this._demoMode() ? 20 : 1));

  setActiveTraining(requestId: string | null): void {
    this._activeTrainingRequestId.set(requestId);
  }

  hasActiveTraining(): boolean {
    return this._activeTrainingRequestId() !== null;
  }

  setEvaluationInProgress(value: boolean): void {
    this._evaluationInProgress.set(value);
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
}

export type Placement = TrainingFormat;
