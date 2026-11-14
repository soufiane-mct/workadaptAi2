import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { NgxEchartsDirective } from 'ngx-echarts';
import { DataService } from '../../core/data/data.service';
import { FORMAT_LABELS, ModuleFormat } from '../../core/models';
import { AXIS_LABEL, CHART_COLORS, TOOLTIP } from '../../core/ui/chart-theme';
import { KpiCard } from '../../shared/ui/kpi-card';
import { PageHeader } from '../../shared/ui/page-header';

interface FormatStat {
  format: ModuleFormat;
  label: string;
  count: number;
  average: number;
  passed: number;
}

/** Formations et certifications internes, vus de manière agrégée (CDC §11.4). */
@Component({
  selector: 'wa-hr-certifications',
  imports: [NgxEchartsDirective, KpiCard, PageHeader],
  templateUrl: './certifications.html',
  styleUrl: './certifications.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HrCertifications {
  private readonly data = inject(DataService);

  readonly results = this.data.evaluationResults;
  readonly followups = this.data.trainingFollowups;
  readonly certificates = this.data.certificates;
  readonly formatLabel = FORMAT_LABELS;

  readonly totalEvaluations = computed(() => this.results().length);

  readonly passRate = computed(() => {
    const results = this.results();
    if (!results.length) {
      return 0;
    }
    return Math.round((results.filter((result) => result.passed).length / results.length) * 100);
  });

  readonly averageScore = computed(() => {
    const results = this.results();
    if (!results.length) {
      return 0;
    }
    return Math.round(results.reduce((sum, result) => sum + result.score, 0) / results.length);
  });

  readonly internalCertificates = computed(
    () => this.results().filter((result) => !!result.certificateId).length,
  );

  readonly completionRate = computed(() => {
    const tracked = this.followups().filter((item) => item.status !== 'PENDING_APPROVAL');
    if (!tracked.length) {
      return 0;
    }
    return Math.round((tracked.filter((item) => item.status === 'COMPLETED').length / tracked.length) * 100);
  });

  readonly formatStats = computed<FormatStat[]>(() =>
    this.data.formats().map((format) => {
      const results = this.results().filter((result) => result.evaluationFormat === format.code);
      const average = results.length
        ? Math.round(results.reduce((sum, result) => sum + result.score, 0) / results.length)
        : 0;
      return {
        format: format.code,
        label: format.label,
        count: results.length,
        average,
        passed: results.filter((result) => result.passed).length,
      };
    }),
  );

  readonly formatChart = computed(() => {
    const stats = this.formatStats();
    return {
      grid: { left: 8, right: 18, top: 20, bottom: 8, containLabel: true },
      tooltip: { ...TOOLTIP, trigger: 'axis' },
      xAxis: {
        type: 'category',
        data: stats.map((stat) => stat.label),
        axisLabel: { ...AXIS_LABEL, rotate: 22, fontSize: 10.5 },
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
          name: 'Score moyen',
          type: 'bar',
          data: stats.map((stat) => stat.average),
          barWidth: 22,
          itemStyle: { color: CHART_COLORS.primary, borderRadius: [6, 6, 0, 0] },
        },
      ],
    };
  });

  readonly courseStats = computed(() => {
    const grouped = new Map<string, { count: number; total: number; passed: number }>();
    for (const result of this.results()) {
      const current = grouped.get(result.courseTitle) ?? { count: 0, total: 0, passed: 0 };
      current.count += 1;
      current.total += result.score;
      current.passed += result.passed ? 1 : 0;
      grouped.set(result.courseTitle, current);
    }
    return [...grouped.entries()].map(([course, value]) => ({
      course,
      count: value.count,
      average: Math.round(value.total / value.count),
      passRate: Math.round((value.passed / value.count) * 100),
    }));
  });
}
