import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DataService } from '../../core/data/data.service';
import {
  ApprovalRequest,
  FORMAT_LABELS,
  TRAINING_REQUEST_STATUS_LABELS,
  TrainingRequest,
} from '../../core/models';
import { PageHeader } from '../../shared/ui/page-header';

@Component({
  selector: 'wa-supervisor-approvals',
  imports: [DatePipe, DecimalPipe, MatButtonModule, PageHeader],
  templateUrl: './approvals.html',
  styleUrl: './approvals.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SupervisorApprovals {
  private readonly data = inject(DataService);
  private readonly snack = inject(MatSnackBar);

  readonly approvals = this.data.approvals;
  readonly team = this.data.team;
  readonly trainingRequests = this.data.trainingRequests;
  readonly filter = signal<'PENDING' | 'ALL'>('PENDING');
  readonly notes = signal<Record<string, string>>({});
  readonly formatLabels = FORMAT_LABELS;
  readonly trainingStatusLabels = TRAINING_REQUEST_STATUS_LABELS;

  readonly visible = computed(() => {
    const all = this.approvals();
    return this.filter() === 'PENDING'
      ? all.filter((request) => request.status === 'PENDING')
      : all;
  });

  readonly visibleTrainings = computed(() => {
    const all = [...this.trainingRequests()].sort((a, b) =>
      b.requestedAt.localeCompare(a.requestedAt),
    );
    return this.filter() === 'PENDING'
      ? all.filter((request) => request.status === 'PENDING')
      : all;
  });

  readonly pendingCount = computed(
    () => this.approvals().filter((request) => request.status === 'PENDING').length,
  );

  readonly pendingTrainingCount = computed(
    () => this.trainingRequests().filter((request) => request.status === 'PENDING').length,
  );

  readonly totalPending = computed(() => this.pendingCount() + this.pendingTrainingCount());

  setNote(requestId: string, value: string): void {
    this.notes.update((state) => ({ ...state, [requestId]: value }));
  }

  noteFor(requestId: string): string {
    return this.notes()[requestId] ?? '';
  }

  decideTraining(
    request: TrainingRequest,
    decision: 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED',
  ): void {
    this.data.decideTrainingRequest(request.id, decision, this.noteFor(request.id));
    const messages: Record<typeof decision, string> = {
      APPROVED: `Formation ${this.formatLabels[request.format].toLowerCase()} approuvée pour ${request.employeeName}. Le contenu est débloqué.`,
      REJECTED: `Demande rejetée pour ${request.employeeName}. L’employé est notifié.`,
      CHANGES_REQUESTED: `Modification demandée à ${request.employeeName}. L’employé est notifié.`,
    };
    this.snack.open(messages[decision], 'Fermer', { duration: 5000 });
    this.notes.update((state) => ({ ...state, [request.id]: '' }));
  }

  trainingStatusClass(status: TrainingRequest['status']): string {
    switch (status) {
      case 'APPROVED':
        return 'wa-chip wa-chip--success';
      case 'REJECTED':
        return 'wa-chip wa-chip--danger';
      case 'CHANGES_REQUESTED':
        return 'wa-chip wa-chip--warning';
      case 'IN_PROGRESS':
        return 'wa-chip wa-chip--info';
      case 'COMPLETED':
        return 'wa-chip wa-chip--neutral';
      default:
        return 'wa-chip wa-chip--warning';
    }
  }

  decide(request: ApprovalRequest, decision: 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED'): void {
    this.data.decideApproval(request.id, decision);
    const messages: Record<typeof decision, string> = {
      APPROVED: `Parcours approuvé pour ${request.employee}. L’employé peut commencer la formation.`,
      REJECTED: `Parcours rejeté pour ${request.employee}. L’agent Learning Planner proposera une alternative.`,
      CHANGES_REQUESTED: `Modification demandée pour ${request.employee}. Le parcours revient à l’agent Learning Planner.`,
    };
    this.snack.open(messages[decision], 'Fermer', { duration: 5000 });
  }

  statusLabel(status: string): string {
    switch (status) {
      case 'APPROVED':
        return 'Approuvé';
      case 'REJECTED':
        return 'Rejeté';
      case 'CHANGES_REQUESTED':
        return 'Modification demandée';
      default:
        return 'En attente';
    }
  }

  statusClass(status: string): string {
    switch (status) {
      case 'APPROVED':
        return 'wa-chip wa-chip--success';
      case 'REJECTED':
        return 'wa-chip wa-chip--danger';
      case 'CHANGES_REQUESTED':
        return 'wa-chip wa-chip--info';
      default:
        return 'wa-chip wa-chip--warning';
    }
  }
}
