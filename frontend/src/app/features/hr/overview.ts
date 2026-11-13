import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { NgxEchartsDirective } from 'ngx-echarts';
import { DataService } from '../../core/data/data.service';
import { KpiUnit } from '../../core/models';
import { AXIS_LABEL, CHART_COLORS, TOOLTIP } from '../../core/ui/chart-theme';
import { KpiCard } from '../../shared/ui/kpi-card';
import { PageHeader } from '../../shared/ui/page-header';

@Component({
  selector: 'wa-hr-overview',
  imports: [NgxEchartsDirective, KpiCard, PageHeader],
  templateUrl: './overview.html',
  styleUrl: './overview.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HrOverview {
  private readonly data = inject(DataService);

  readonly kpis = this.data.kpis;
  readonly team = this.data.team;
  readonly approvals = this.data.approvals;

  readonly pending = computed(
    () => this.approvals().filter((request) => request.status === 'PENDING').length,
  );

  readonly average = computed(() => {
    const members = this.team().filter((member) => member.averageLevel > 0);
    if (members.length === 0) {
      return 0;
    }
    return Math.round(members.reduce((sum, member) => sum + member.averageLevel, 0) / members.length);
  });

  readonly teamChart = computed(() => ({
    grid: { left: 8, right: 20, top: 24, bottom: 8, containLabel: true },
    tooltip: { ...TOOLTIP, trigger: 'axis', axisPointer: { type: 'shadow' } },
    xAxis: {
      type: 'category',
      data: this.team()
        .filter((member) => member.averageLevel > 0)
        .map((member) => member.name.split(' ')[0]),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: AXIS_LABEL,
    },
    yAxis: {
      type: 'value',
      max: 100,
      splitLine: { lineStyle: { color: CHART_COLORS.grid, type: 'dashed' } },
      axisLabel: { fontSize: 11, color: CHART_COLORS.axisFaint },
    },
    series: [
      {
        type: 'bar',
        data: this.team()
          .filter((member) => member.averageLevel > 0)
          .map((member) => member.averageLevel),
        barWidth: 30,
        itemStyle: {
          borderRadius: [7, 7, 0, 0],
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: CHART_COLORS.primary },
              { offset: 1, color: '#8ba0ff' },
            ],
          },
        },
      },
    ],
  }));

  unitLabel(unit: KpiUnit): string {
    switch (unit) {
      case 'PERCENT':
        return '%';
      case 'POINTS':
        return 'pts';
      default:
        return 'min';
    }
  }

  /** Pourcentage d'atteinte de la cible (borné à 100). */
  attainment(current: number, target: number): number {
    if (target === 0) {
      return 0;
    }
    return Math.min(100, Math.round((current / target) * 100));
  }

  kpiTone(current: number, target: number, direction: 'UP' | 'DOWN'): string {
    const ok = direction === 'UP' ? current >= target : current <= target;
    return ok ? 'wa-chip wa-chip--success' : 'wa-chip wa-chip--warning';
  }
}
