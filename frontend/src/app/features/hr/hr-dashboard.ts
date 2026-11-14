import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { NgxEchartsDirective } from 'ngx-echarts';
import { DataService } from '../../core/data/data.service';
import { FORMAT_LABELS, ModuleFormat } from '../../core/models';
import { AXIS_LABEL, CHART_COLORS, LEGEND_TEXT, TOOLTIP } from '../../core/ui/chart-theme';
import { KpiCard } from '../../shared/ui/kpi-card';
import { PageHeader } from '../../shared/ui/page-header';

const FORMAT_COLORS: Record<ModuleFormat, string> = {
  MULTIMEDIA: '#2f54eb',
  INTERACTIVE: '#7c3aed',
  PRACTICAL: '#0f9d58',
  PROJECT: '#0ea5a5',
  SIMULATION: '#e08a00',
  AI_TUTORED: '#d946a0',
  COLLABORATIVE: '#64748b',
};

/**
 * Tableau de bord RH (CDC §11.4).
 *
 * Vue strictement agrégée : aucune donnée nominative, aucun détail individuel.
 * Elle sert à orienter la politique de formation, pas à évaluer une personne.
 */
@Component({
  selector: 'wa-hr-dashboard',
  imports: [
    RouterLink,
    MatButtonModule,
    NgxEchartsDirective,
    KpiCard,
    PageHeader,
  ],
  templateUrl: './hr-dashboard.html',
  styleUrl: './hr-dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HrDashboard {
  private readonly data = inject(DataService);

  readonly team = computed(() => this.data.team().filter((member) => member.status === 'ACTIVE'));
  readonly needs = this.data.trainingNeeds;
  readonly followups = this.data.trainingFollowups;

  readonly averageLevel = computed(() => {
    const members = this.team().filter((member) => member.averageLevel > 0);
    if (!members.length) {
      return 0;
    }
    return Math.round(members.reduce((sum, member) => sum + member.averageLevel, 0) / members.length);
  });

  readonly highNeeds = computed(() => this.needs().filter((need) => need.priority === 'HIGH'));

  readonly completedTrainings = computed(
    () => this.followups().filter((item) => item.status === 'COMPLETED').length,
  );

  readonly completionRate = computed(() => {
    const tracked = this.followups().filter((item) => item.status !== 'PENDING_APPROVAL');
    if (!tracked.length) {
      return 0;
    }
    return Math.round(
      (tracked.filter((item) => item.status === 'COMPLETED').length / tracked.length) * 100,
    );
  });

  readonly kpiAttainment = computed(() => {
    const kpis = this.data.kpis();
    if (!kpis.length) {
      return 0;
    }
    const total = kpis.reduce((sum, kpi) => {
      const ratio =
        kpi.direction === 'UP' ? kpi.current / kpi.target : kpi.target / Math.max(1, kpi.current);
      return sum + Math.min(100, Math.round(ratio * 100));
    }, 0);
    return Math.round(total / kpis.length);
  });

  readonly trendChart = computed(() => {
    const series = this.data.skillTrends();
    const months = series[0]?.points.map((point) => point.month) ?? [];
    const palette = [CHART_COLORS.primary, CHART_COLORS.violet, '#0f9d58', '#e08a00'];

    return {
      color: palette,
      grid: { left: 8, right: 18, top: 34, bottom: 8, containLabel: true },
      tooltip: { ...TOOLTIP, trigger: 'axis' },
      legend: { top: 0, textStyle: LEGEND_TEXT, itemWidth: 10, itemHeight: 10 },
      xAxis: {
        type: 'category',
        data: months,
        axisLabel: AXIS_LABEL,
        axisLine: { lineStyle: { color: CHART_COLORS.grid } },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        max: 100,
        axisLabel: AXIS_LABEL,
        splitLine: { lineStyle: { color: CHART_COLORS.grid } },
      },
      series: series.map((item) => ({
        name: item.skill,
        type: 'line',
        smooth: true,
        symbolSize: 6,
        lineStyle: { width: 2.5 },
        data: item.points.map((point) => point.level),
      })),
    };
  });

  readonly formatChart = computed(() => {
    const counts = new Map<ModuleFormat, number>();
    for (const item of this.followups()) {
      counts.set(item.format, (counts.get(item.format) ?? 0) + 1);
    }
    return {
      tooltip: { ...TOOLTIP, trigger: 'item' },
      legend: {
        bottom: 0,
        textStyle: LEGEND_TEXT,
        itemWidth: 9,
        itemHeight: 9,
      },
      series: [
        {
          type: 'pie',
          radius: ['46%', '70%'],
          center: ['50%', '44%'],
          avoidLabelOverlap: true,
          itemStyle: { borderColor: '#fff', borderWidth: 2 },
          label: { show: false },
          data: [...counts.entries()].map(([format, value]) => ({
            name: FORMAT_LABELS[format],
            value,
            itemStyle: { color: FORMAT_COLORS[format] },
          })),
        },
      ],
    };
  });

  readonly formatLabel = FORMAT_LABELS;

  priorityTone(priority: string): string {
    if (priority === 'HIGH') {
      return 'wa-chip wa-chip--danger';
    }
    if (priority === 'MEDIUM') {
      return 'wa-chip wa-chip--warning';
    }
    return 'wa-chip wa-chip--neutral';
  }

  priorityLabel(priority: string): string {
    return priority === 'HIGH' ? 'Haute' : priority === 'MEDIUM' ? 'Moyenne' : 'Basse';
  }
}
