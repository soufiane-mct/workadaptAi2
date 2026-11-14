import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { NgxEchartsDirective } from 'ngx-echarts';
import { DataService } from '../../core/data/data.service';
import { FORMAT_LABELS, MemberSkill } from '../../core/models';
import { AXIS_LABEL, CHART_COLORS, TOOLTIP } from '../../core/ui/chart-theme';
import { KpiCard } from '../../shared/ui/kpi-card';
import { PageHeader } from '../../shared/ui/page-header';

interface TeamGap {
  employee: string;
  employeeId: string;
  skill: MemberSkill;
  gap: number;
}

/**
 * Tableau de bord du superviseur (CDC §11.3).
 *
 * Vue de pilotage de l'équipe : validations en attente, avancement des
 * formations, résultats autorisés et écarts à surveiller. Aucune donnée
 * personnelle de l'employé connecté n'est réutilisée.
 */
@Component({
  selector: 'wa-manager-dashboard',
  imports: [
    RouterLink,
    DatePipe,
    MatButtonModule,
    MatProgressBarModule,
    NgxEchartsDirective,
    KpiCard,
    PageHeader,
  ],
  templateUrl: './manager-dashboard.html',
  styleUrl: './manager-dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ManagerDashboard {
  private readonly data = inject(DataService);

  readonly team = computed(() =>
    this.data.team().filter((member) => member.status === 'ACTIVE'),
  );

  readonly pendingApprovals = computed(
    () => this.data.approvals().filter((request) => request.status === 'PENDING'),
  );

  readonly pendingTrainings = computed(
    () => this.data.trainingFollowups().filter((item) => item.status === 'PENDING_APPROVAL'),
  );

  readonly inProgress = computed(
    () => this.data.trainingFollowups().filter((item) => item.status === 'IN_PROGRESS'),
  );

  readonly completed = computed(
    () => this.data.trainingFollowups().filter((item) => item.status === 'COMPLETED'),
  );

  readonly averageLevel = computed(() => {
    const members = this.team().filter((member) => member.averageLevel > 0);
    if (!members.length) {
      return 0;
    }
    return Math.round(members.reduce((sum, member) => sum + member.averageLevel, 0) / members.length);
  });

  readonly validationsTotal = computed(
    () => this.pendingApprovals().length + this.pendingTrainings().length,
  );

  readonly teamChart = computed(() => {
    const members = this.team().filter((member) => member.averageLevel > 0);
    return {
      grid: { left: 8, right: 18, top: 24, bottom: 8, containLabel: true },
      tooltip: { ...TOOLTIP, trigger: 'axis' },
      xAxis: {
        type: 'value',
        max: 100,
        axisLabel: AXIS_LABEL,
        splitLine: { lineStyle: { color: CHART_COLORS.grid } },
      },
      yAxis: {
        type: 'category',
        data: members.map((member) => member.name),
        axisLabel: { ...AXIS_LABEL, fontSize: 11.5 },
        axisLine: { lineStyle: { color: CHART_COLORS.grid } },
        axisTick: { show: false },
      },
      series: [
        {
          type: 'bar',
          name: 'Niveau moyen',
          data: members.map((member) => member.averageLevel),
          barWidth: 14,
          itemStyle: { color: CHART_COLORS.primary, borderRadius: [0, 6, 6, 0] },
        },
      ],
    };
  });

  readonly criticalGaps = computed<TeamGap[]>(() =>
    this.team()
      .flatMap((member) =>
        (member.skills ?? []).map((skill) => ({
          employee: member.name,
          employeeId: member.id,
          skill,
          gap: Math.max(0, skill.target - skill.level),
        })),
      )
      .filter((item) => item.gap >= 20)
      .sort((a, b) => b.gap - a.gap)
      .slice(0, 6),
  );

  readonly recentResults = computed(() =>
    [...this.data.evaluationResults()]
      .sort((a, b) => b.at.localeCompare(a.at))
      .slice(0, 5),
  );

  readonly formatLabel = FORMAT_LABELS;

  statusLabel(status: string): string {
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

  gapTone(gap: number): string {
    return gap >= 30 ? 'wa-chip wa-chip--danger' : 'wa-chip wa-chip--warning';
  }
}
