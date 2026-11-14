import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NgxEchartsDirective } from 'ngx-echarts';
import { DataService } from '../../core/data/data.service';
import { SkillTrendSeries } from '../../core/models';
import { AXIS_LABEL, CHART_COLORS, LEGEND_TEXT, TOOLTIP } from '../../core/ui/chart-theme';
import { KpiCard } from '../../shared/ui/kpi-card';
import { PageHeader } from '../../shared/ui/page-header';

/** Tendances agrégées des compétences sur six mois (CDC §11.4). */
@Component({
  selector: 'wa-hr-trends',
  imports: [NgxEchartsDirective, KpiCard, PageHeader],
  templateUrl: './trends.html',
  styleUrl: './trends.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HrTrends {
  private readonly data = inject(DataService);

  readonly selected = signal('ALL');
  readonly series = this.data.skillTrends;

  readonly months = computed(() => this.series()[0]?.points.map((point) => point.month) ?? []);

  readonly visibleSeries = computed(() => {
    const selected = this.selected();
    return selected === 'ALL'
      ? this.series()
      : this.series().filter((item) => item.skill === selected);
  });

  readonly chart = computed(() => {
    const palette = [CHART_COLORS.primary, CHART_COLORS.violet, '#0f9d58', '#e08a00'];
    return {
      color: palette,
      grid: { left: 8, right: 20, top: 36, bottom: 8, containLabel: true },
      tooltip: { ...TOOLTIP, trigger: 'axis' },
      legend: { top: 0, textStyle: LEGEND_TEXT, itemWidth: 10, itemHeight: 10 },
      xAxis: {
        type: 'category',
        data: this.months(),
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
      series: this.visibleSeries().map((item) => ({
        name: item.skill,
        type: 'line',
        smooth: true,
        symbolSize: 7,
        lineStyle: { width: 2.5 },
        areaStyle: { opacity: 0.06 },
        data: item.points.map((point) => point.level),
      })),
    };
  });

  readonly summary = computed(() =>
    this.series().map((item: SkillTrendSeries) => {
      const first = item.points[0]?.level ?? 0;
      const last = item.points[item.points.length - 1]?.level ?? 0;
      return {
        skill: item.skill,
        first,
        last,
        delta: last - first,
      };
    }),
  );

  readonly emerging = computed(() =>
    [...this.summary()].sort((a, b) => b.delta - a.delta).slice(0, 2),
  );

  readonly declining = computed(() =>
    [...this.summary()].filter((item) => item.delta <= 0).sort((a, b) => a.delta - b.delta),
  );

  readonly averageDelta = computed(() => {
    const summary = this.summary();
    if (!summary.length) {
      return 0;
    }
    return Math.round((summary.reduce((sum, item) => sum + item.delta, 0) / summary.length) * 10) / 10;
  });
}
