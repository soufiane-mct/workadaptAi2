import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { DataService } from '../../core/data/data.service';
import { AgentHealth, ROLE_LABELS } from '../../core/models';
import { PageHeader } from '../../shared/ui/page-header';

@Component({
  selector: 'wa-agent-control-center',
  imports: [DatePipe, DecimalPipe, PageHeader],
  templateUrl: './agents.html',
  styleUrl: './agents.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AgentControlCenter {
  private readonly data = inject(DataService);

  readonly agents = this.data.agents;
  readonly workflows = this.data.workflows;
  readonly exchanges = this.data.agentExchanges;
  readonly roleLabels = ROLE_LABELS;

  readonly running = computed(() => this.agents().filter((agent) => agent.health === 'RUNNING').length);
  readonly errors = computed(() => this.agents().filter((agent) => agent.health === 'ERROR').length);
  readonly waiting = computed(
    () => this.agents().filter((agent) => agent.health === 'WAITING_APPROVAL').length,
  );

  healthLabel(health: AgentHealth): string {
    switch (health) {
      case 'RUNNING':
        return 'Actif';
      case 'IDLE':
        return 'Au repos';
      case 'WAITING_APPROVAL':
        return 'En attente de validation';
      default:
        return 'Erreur';
    }
  }

  healthClass(health: AgentHealth): string {
    switch (health) {
      case 'RUNNING':
        return 'wa-chip wa-chip--success';
      case 'IDLE':
        return 'wa-chip wa-chip--neutral';
      case 'WAITING_APPROVAL':
        return 'wa-chip wa-chip--warning';
      default:
        return 'wa-chip wa-chip--danger';
    }
  }

  workflowClass(status: string): string {
    switch (status) {
      case 'COMPLETED':
        return 'wa-chip wa-chip--success';
      case 'RUNNING':
        return 'wa-chip wa-chip--info';
      case 'WAITING_APPROVAL':
        return 'wa-chip wa-chip--warning';
      default:
        return 'wa-chip wa-chip--danger';
    }
  }

  workflowLabel(status: string): string {
    switch (status) {
      case 'COMPLETED':
        return 'Terminé';
      case 'RUNNING':
        return 'En cours';
      case 'WAITING_APPROVAL':
        return 'En attente';
      default:
        return 'Échec';
    }
  }

  stepClass(state: string): string {
    switch (state) {
      case 'DONE':
        return 'step step--done';
      case 'RUNNING':
        return 'step step--running';
      case 'FAILED':
        return 'step step--failed';
      default:
        return 'step';
    }
  }

  stepLabel(state: string): string {
    switch (state) {
      case 'DONE':
        return 'Terminé';
      case 'RUNNING':
        return 'En cours';
      case 'FAILED':
        return 'Échec';
      default:
        return 'En attente';
    }
  }

  exchangeClass(status: string): string {
    switch (status) {
      case 'DELIVERED':
        return 'wa-chip wa-chip--success';
      case 'PENDING':
        return 'wa-chip wa-chip--warning';
      default:
        return 'wa-chip wa-chip--danger';
    }
  }

  exchangeLabel(status: string): string {
    switch (status) {
      case 'DELIVERED':
        return 'Délivré';
      case 'PENDING':
        return 'En attente';
      default:
        return 'Échec';
    }
  }
}
