import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { NgxEchartsDirective } from 'ngx-echarts';
import { DataService } from '../../core/data/data.service';
import { FORMAT_LABELS } from '../../core/models';
import { AXIS_LABEL, CHART_COLORS, TOOLTIP } from '../../core/ui/chart-theme';
import { KpiCard } from '../../shared/ui/kpi-card';
import { PageHeader } from '../../shared/ui/page-header';

/** Besoins de formation agrégés par compétence et département (CDC §11.4). */
@Component({
  selector: 'wa-hr-training-needs',
  imports: [RouterLink, MatButtonModule, NgxEchartsDirective, KpiCard, PageHeader],
  templateUrl: './training-needs.html',
  styleUrl: './training-needs.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HrTrainingNeeds {
  private readonly data = inject(DataService);

  readonly departmentFilter = signal('ALL');
  readonly priorityFilter = signal('ALL');
  readonly formatLabel = FORMAT_LABELS;

  readonly needs = this.data.trainingNeeds;

  readonly departments = computed(() => [
    'ALL',
    ...Array.from(new Set(this.needs().map((need) => need.department))).sort(),
  ]);

  readonly filtered = computed(() =>
    this.needs()
      .filter((need) => this.departmentFilter() === 'ALL' || need.department === this.departmentFilter())
      .filter((need) => this.priorityFilter() === 'ALL' || need.priority === this.priorityFilter())
      .sort((a, b) => b.averageGap - a.averageGap),
  );

  readonly highCount = computed(() => this.needs().filter((need) => need.priority === 'HIGH').length);

  readonly employeesConcerned = computed(() => {
    const skills = new Set<string>();
    for (const need of this.needs()) {
      skills.add(need.skill);
    }
    return skills.size;
  });

  readonly averageGap = computed(() => {
    const needs = this.needs();
    if (!needs.length) {
      return 0;
    }
    return Math.round(needs.reduce((sum, need) => sum + need.averageGap, 0) / needs.length);
  });

  readonly gapChart = computed(() => {
    const needs = [...this.needs()].sort((a, b) => a.averageGap - b.averageGap);
    return {
      grid: { left: 8, right: 26, top: 16, bottom: 8, containLabel: true },
      tooltip: { ...TOOLTIP, trigger: 'axis' },
      xAxis: {
        type: 'value',
        axisLabel: AXIS_LABEL,
        splitLine: { lineStyle: { color: CHART_COLORS.grid } },
      },
      yAxis: {
        type: 'category',
        data: needs.map((need) => need.skill),
        axisLabel: { ...AXIS_LABEL, fontSize: 11.5 },
        axisLine: { lineStyle: { color: CHART_COLORS.grid } },
        axisTick: { show: false },
      },
      series: [
        {
          type: 'bar',
          name: 'Écart moyen (pts)',
          data: needs.map((need) => need.averageGap),
          barWidth: 14,
          itemStyle: { color: CHART_COLORS.violet, borderRadius: [0, 6, 6, 0] },
        },
      ],
    };
  });

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
