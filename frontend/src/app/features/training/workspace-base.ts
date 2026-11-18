import { computed, Directive, inject, input, signal } from '@angular/core';
import { TrainingProgram, TrainingProgress, TrainingRequest } from '../../core/models';
import { DataService } from '../../core/data/data.service';
import { programUnits } from '../../core/data/training/helpers';

/**
 * Base commune aux sept espaces de formation.
 *
 * Elle ne porte que le strict nécessaire : accès aux données, unités et
 * progression. Chaque format garde son interface, sa progression visuelle
 * et sa preuve de fin.
 */
@Directive()
export abstract class WorkspaceBase {
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
      this.selectedUnitId.set(unitId);
    }
  }

  complete(unitId: string, minutes?: number): void {
    if (!this.editable()) {
      return;
    }
    this.data.completeTrainingUnit(this.request().id, unitId, minutes);
  }
}
