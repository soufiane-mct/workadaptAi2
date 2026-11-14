import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { NgxEchartsDirective } from 'ngx-echarts';
import { DataService } from '../../core/data/data.service';
import { AXIS_LABEL, CHART_COLORS, TOOLTIP } from '../../core/ui/chart-theme';
import { KpiCard } from '../../shared/ui/kpi-card';
import { PageHeader } from '../../shared/ui/page-header';

/**
 * Tableau de bord administrateur : santé de la plateforme, agents IA et
 * workflows. Il ne contient aucune donnée de compétence individuelle.
 */
@Component({
  selector: 'wa-admin-dashboard',
  imports: [RouterLink, DatePipe, MatButtonModule, NgxEchartsDirective, KpiCard, PageHeader],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminDashboard {
  private readonly data = inject(DataService);

  readonly agents = this.data.agents;
  readonly workflows = this.data.workflows;
  readonly audit = this.data.audit;
  readonly exchanges = this.data.agentExchanges;

  readonly runningAgents = computed(
    () => this.agents().filter((agent) => agent.health === 'RUNNING').length,
  );

  readonly activeWorkflows = computed(
    () => this.workflows().filter((workflow) => workflow.status === 'RUNNING').length,
  );

  readonly incidents = computed(
    () =>
      this.agents().filter((agent) => agent.health === 'ERROR').length +
      this.workflows().filter((workflow) => workflow.status === 'FAILED').length,
  );

  readonly activeAccounts = computed(
    () => this.data.team().filter((member) => member.status === 'ACTIVE').length,
  );

  readonly successChart = computed(() => ({
    tooltip: { ...TOOLTIP, trigger: 'axis' },
    grid: { left: 8, right: 18, top: 20, bottom: 8, containLabel: true },
    xAxis: {
      type: 'category',
      data: this.agents().map((agent) => agent.name),
      axisLabel: { ...AXIS_LABEL, rotate: 24, fontSize: 10.5 },
      axisLine: { lineStyle: { color: CHART_COLORS.grid } },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      max: 100,
      axisLabel: AXIS_LABEL,
      splitLine: { lineStyle: { color: CHART_COLORS.grid } },
    },
    series: [
      {
        type: 'bar',
        name: 'Taux de réussite',
        data: this.agents().map((agent) => agent.successRate),
        barWidth: 18,
        itemStyle: { color: CHART_COLORS.violet, borderRadius: [6, 6, 0, 0] },
      },
    ],
  }));

  readonly recentAudit = computed(() => this.audit().slice(0, 6));
  readonly recentExchanges = computed(() => this.exchanges().slice(0, 6));

  healthTone(health: string): string {
    if (health === 'RUNNING') {
      return 'wa-chip wa-chip--success';
    }
    if (health === 'ERROR') {
      return 'wa-chip wa-chip--danger';
    }
    if (health === 'WAITING_APPROVAL') {
      return 'wa-chip wa-chip--warning';
    }
    return 'wa-chip wa-chip--neutral';
  }

  healthLabel(health: string): string {
    switch (health) {
      case 'RUNNING':
        return 'Actif';
      case 'IDLE':
        return 'En veille';
      case 'WAITING_APPROVAL':
        return 'Attente validation';
      case 'ERROR':
        return 'Erreur';
      default:
        return health;
    }
  }

  workflowTone(status: string): string {
    if (status === 'COMPLETED') {
      return 'wa-chip wa-chip--success';
    }
    if (status === 'FAILED') {
      return 'wa-chip wa-chip--danger';
    }
    if (status === 'WAITING_APPROVAL') {
      return 'wa-chip wa-chip--warning';
    }
    return 'wa-chip wa-chip--info';
  }

  workflowLabel(status: string): string {
    switch (status) {
      case 'RUNNING':
        return 'En cours';
      case 'COMPLETED':
        return 'Terminé';
      case 'WAITING_APPROVAL':
        return 'Attente validation';
      case 'FAILED':
        return 'Échec';
      default:
        return status;
    }
  }
}
