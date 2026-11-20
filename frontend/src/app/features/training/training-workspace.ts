import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  FORMAT_LABELS,
  TrainingProgram,
  TrainingProgress,
  TrainingRequest,
  TRAINING_REQUEST_STATUS_LABELS,
} from '../../core/models';
import { DataService } from '../../core/data/data.service';
import { MultimediaWorkspace } from './multimedia-workspace';
import { InteractiveWorkspace } from './interactive-workspace';
import { PracticalWorkspace } from './practical-workspace';
import { ProjectWorkspace } from './project-workspace';
import { SimulationWorkspace } from './simulation-workspace';
import { AiTutoredWorkspace } from './ai-tutored-workspace';
import { CollaborativeWorkspace } from './collaborative-workspace';

const ACCENTS: Record<string, { accent: string; soft: string; head: string }> = {
  MULTIMEDIA: { accent: '#2f54eb', soft: '#eef2ff', head: 'linear-gradient(135deg,#23305f,#3c2b6e)' },
  INTERACTIVE: { accent: '#7c3aed', soft: '#f4ecff', head: 'linear-gradient(135deg,#4b2a86,#7b3fe4)' },
  PRACTICAL: { accent: '#0e9f9a', soft: '#e6f7f6', head: 'linear-gradient(135deg,#0b4f4c,#0e9f9a)' },
  PROJECT: { accent: '#b26a00', soft: '#fdf3e2', head: 'linear-gradient(135deg,#6b4200,#c27c10)' },
  SIMULATION: { accent: '#c2417a', soft: '#fdeaf3', head: 'linear-gradient(135deg,#5f1738,#b23a6d)' },
  AI_TUTORED: { accent: '#0f9d58', soft: '#e7f7ef', head: 'linear-gradient(135deg,#0a5132,#12945c)' },
  COLLABORATIVE: { accent: '#475569', soft: '#eef1f6', head: 'linear-gradient(135deg,#2b3446,#546074)' },
};

@Component({
  selector: 'wa-training-workspace',
  imports: [
    RouterLink,
    MultimediaWorkspace,
    InteractiveWorkspace,
    PracticalWorkspace,
    ProjectWorkspace,
    SimulationWorkspace,
    AiTutoredWorkspace,
    CollaborativeWorkspace,
  ],
  templateUrl: './training-workspace.html',
  styleUrl: './workspace.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrainingWorkspace {
  private readonly data = inject(DataService);

  readonly requestId = input.required<string>();

  readonly request = computed(() => this.data.requestById(this.requestId()));
  readonly program = computed(() => this.data.programFor(this.requestId()));
  readonly progress = computed(() => this.data.progressFor(this.requestId()));
  readonly certificate = computed(() => this.data.certificateFor(this.requestId()));
  readonly evaluation = computed(() => this.data.evaluationFor(this.requestId()));
  readonly completion = computed(() => this.data.completionState(this.requestId()));
  readonly statusLabels = TRAINING_REQUEST_STATUS_LABELS;
  readonly formatLabels = FORMAT_LABELS;
  readonly capstoneProof = signal('');
  readonly feedback = signal('');
  readonly showPreview = signal(false);

  readonly editable = computed(() => this.request()?.status === 'IN_PROGRESS');
  readonly canStart = computed(
    () =>
      this.request()?.status === 'APPROVED' || this.request()?.status === 'CHANGES_REQUESTED',
  );
  readonly isPending = computed(() => this.request()?.status === 'PENDING');
  readonly isCompleted = computed(() => this.request()?.status === 'COMPLETED');
  readonly canSubmitCapstone = computed(
    () =>
      this.completion().missingUnits.length === 0 &&
      !this.progress()?.capstoneValidated &&
      // Le service exige une preuve substantielle : le bouton ne doit pas
      // promettre un dépôt qui serait refusé.
      this.capstoneProof().trim().length >= 20,
  );

  readonly accent = computed(() => ACCENTS[this.program()?.format ?? 'MULTIMEDIA']);
  readonly capstoneLabel = computed(() =>
    this.program() ? this.data.trainingService.capstoneLabel(this.program()!) : '',
  );
  readonly unitCount = computed(() => this.progress()?.units.length ?? 0);
  readonly doneCount = computed(
    () => this.progress()?.units.filter((unit) => unit.status === 'DONE').length ?? 0,
  );

  start(): void {
    this.data.startTraining(this.requestId());
  }

  submitCapstone(): void {
    const result = this.data.submitCapstone(this.requestId(), this.capstoneProof());
    this.feedback.set(result.message);
    if (result.ok) {
      this.capstoneProof.set('');
    }
  }

  complete(): void {
    const result = this.data.completeTraining(this.requestId());
    this.feedback.set(result.message);
  }

  setProof(value: string): void {
    this.capstoneProof.set(value);
  }

  program_(): TrainingProgram {
    return this.program() as TrainingProgram;
  }

  progress_(): TrainingProgress {
    return this.progress() as TrainingProgress;
  }

  request_(): TrainingRequest {
    return this.request() as TrainingRequest;
  }

  openPreview(): void {
    this.showPreview.update((value) => !value);
  }
}
