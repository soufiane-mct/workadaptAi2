import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DataService } from '../../core/data/data.service';
import { AuthService } from '../../core/auth/auth.service';
import {
  FORMAT_LABELS,
  ModuleFormat,
  SkillGap,
  TRAINING_REQUEST_STATUS_LABELS,
  TrainingRequest,
} from '../../core/models';
import { PageHeader } from '../../shared/ui/page-header';

@Component({
  selector: 'wa-employee-formats',
  imports: [RouterLink, DatePipe, MatButtonModule, PageHeader],
  templateUrl: './formats.html',
  styleUrl: './formats.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmployeeFormats {
  private readonly data = inject(DataService);
  private readonly auth = inject(AuthService);
  private readonly snack = inject(MatSnackBar);

  readonly formats = this.data.formats;
  readonly gaps = this.data.skillGaps;
  readonly requests = this.data.trainingRequests;
  readonly statusLabels = TRAINING_REQUEST_STATUS_LABELS;

  readonly selectedGapId = signal<string | null>(null);
  readonly selectedFormat = signal<ModuleFormat | null>(null);
  readonly subject = signal('');
  readonly objective = signal('');

  readonly currentMember = computed(() => {
    const name = this.auth.user()?.name;
    return this.data.team().find((member) => member.name === name) ?? this.data.team()[0];
  });

  readonly selectedGap = computed<SkillGap | null>(() => {
    const id = this.selectedGapId();
    return this.gaps().find((gap) => gap.id === id) ?? this.gaps()[0] ?? null;
  });

  readonly myRequests = computed(() => {
    const member = this.currentMember();
    return this.requests()
      .filter((request) => request.employeeId === member?.id)
      .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
  });

  readonly canSubmit = computed(
    () =>
      !!this.selectedGap() &&
      !!this.selectedFormat() &&
      this.subject().trim().length >= 3 &&
      this.objective().trim().length >= 10,
  );

  readonly pendingCount = computed(
    () => this.myRequests().filter((request) => request.status === 'PENDING').length,
  );

  readonly selectedFormatLabel = computed(() => {
    const code = this.selectedFormat();
    return code ? FORMAT_LABELS[code] : 'Aucun format choisi';
  });

  /** Formats réellement mobilisés par le parcours en cours (catalogue de référence). */
  readonly usedFormats = computed(
    () => new Set((this.data.activeCourse()?.modules ?? []).map((module) => module.format)),
  );

  constructor() {
    const first = this.gaps()[0];
    if (first) {
      this.selectGap(first);
    }
  }

  selectGap(gap: SkillGap): void {
    this.selectedGapId.set(gap.id);
    this.subject.set('Mise en pratique en situation réelle');
    this.objective.set(
      `Combler l’écart de ${gap.gap} points sur ${gap.skillLabel} et atteindre un niveau ${gap.targetLevel} / 100 en situation réelle.`,
    );
  }

  selectFormat(code: ModuleFormat): void {
    this.selectedFormat.set(this.selectedFormat() === code ? null : code);
  }

  isRecommended(code: ModuleFormat): boolean {
    return this.selectedGap()?.recommendedFormats.includes(code) ?? false;
  }

  isUsed(code: ModuleFormat): boolean {
    return this.usedFormats().has(code);
  }

  createRequest(): void {
    const gap = this.selectedGap();
    const format = this.selectedFormat();
    const member = this.currentMember();
    if (!gap || !format || !member) {
      return;
    }

    this.data.createTrainingRequest({
      employeeId: member.id,
      employeeName: member.name,
      gap,
      format,
      subject: this.subject().trim(),
      objective: this.objective().trim(),
    });

    this.snack.open(
      'Demande générée et transmise au superviseur. La formation sera accessible après validation.',
      'Fermer',
      { duration: 6000 },
    );
    this.selectedFormat.set(null);
  }

  trainingLink(request: TrainingRequest): string {
    return `/app/formations/${request.id}`;
  }

  statusTone(status: TrainingRequest['status']): string {
    switch (status) {
      case 'APPROVED':
        return 'wa-chip wa-chip--success';
      case 'PENDING':
        return 'wa-chip wa-chip--warning';
      case 'REJECTED':
        return 'wa-chip wa-chip--danger';
      case 'CHANGES_REQUESTED':
        return 'wa-chip wa-chip--warning';
      case 'IN_PROGRESS':
        return 'wa-chip wa-chip--info';
      default:
        return 'wa-chip wa-chip--neutral';
    }
  }

  formatLabel(code: ModuleFormat): string {
    return FORMAT_LABELS[code];
  }

  priorityTone(priority: SkillGap['priority']): string {
    if (priority === 'HIGH') {
      return 'wa-chip wa-chip--danger';
    }
    if (priority === 'MEDIUM') {
      return 'wa-chip wa-chip--warning';
    }
    return 'wa-chip wa-chip--neutral';
  }

  priorityLabel(priority: SkillGap['priority']): string {
    return priority === 'HIGH' ? 'Priorité haute' : priority === 'MEDIUM' ? 'Priorité moyenne' : 'Priorité basse';
  }
}
