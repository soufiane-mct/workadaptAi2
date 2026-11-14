import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { DataService } from '../../core/data/data.service';
import { FORMAT_LABELS, TrainingFollowUpStatus } from '../../core/models';
import { KpiCard } from '../../shared/ui/kpi-card';
import { PageHeader } from '../../shared/ui/page-header';

type FollowUpFilter = 'ALL' | TrainingFollowUpStatus;

/** Suivi des formations de l'équipe, tous formats confondus (CDC §11.3). */
@Component({
  selector: 'wa-training-followup',
  imports: [DatePipe, RouterLink, MatButtonModule, KpiCard, PageHeader],
  templateUrl: './training-followup.html',
  styleUrl: './training-followup.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrainingFollowUp {
  private readonly data = inject(DataService);

  readonly filter = signal<FollowUpFilter>('ALL');
  readonly formatFilter = signal('ALL');

  readonly followups = this.data.trainingFollowups;
  readonly formats = this.data.formats;

  readonly filtered = computed(() => {
    const status = this.filter();
    const format = this.formatFilter();
    return this.followups()
      .filter((item) => status === 'ALL' || item.status === status)
      .filter((item) => format === 'ALL' || item.format === format)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  });

  readonly pending = computed(
    () => this.followups().filter((item) => item.status === 'PENDING_APPROVAL').length,
  );
  readonly inProgress = computed(
    () => this.followups().filter((item) => item.status === 'IN_PROGRESS').length,
  );
  readonly completed = computed(
    () => this.followups().filter((item) => item.status === 'COMPLETED').length,
  );
  readonly failed = computed(
    () => this.followups().filter((item) => item.status === 'FAILED').length,
  );

  readonly formatLabel = FORMAT_LABELS;

  readonly statusOptions: { code: FollowUpFilter; label: string }[] = [
    { code: 'ALL', label: 'Toutes' },
    { code: 'PENDING_APPROVAL', label: 'À valider' },
    { code: 'NOT_STARTED', label: 'Non commencées' },
    { code: 'IN_PROGRESS', label: 'En cours' },
    { code: 'COMPLETED', label: 'Terminées' },
    { code: 'FAILED', label: 'Échouées' },
  ];

  statusLabel(status: TrainingFollowUpStatus): string {
    switch (status) {
      case 'PENDING_APPROVAL':
        return 'À valider';
      case 'NOT_STARTED':
        return 'Non commencée';
      case 'IN_PROGRESS':
        return 'En cours';
      case 'COMPLETED':
        return 'Terminée';
      case 'FAILED':
        return 'Échouée';
      default:
        return status;
    }
  }

  statusTone(status: TrainingFollowUpStatus): string {
    switch (status) {
      case 'COMPLETED':
        return 'wa-chip wa-chip--success';
      case 'FAILED':
        return 'wa-chip wa-chip--danger';
      case 'PENDING_APPROVAL':
        return 'wa-chip wa-chip--warning';
      case 'IN_PROGRESS':
        return 'wa-chip wa-chip--info';
      default:
        return 'wa-chip wa-chip--neutral';
    }
  }
}
