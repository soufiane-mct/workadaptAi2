import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe, DecimalPipe, PercentPipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { NgxEchartsDirective } from 'ngx-echarts';
import { DataService } from '../../core/data/data.service';
import { AuthService } from '../../core/auth/auth.service';
import { FORMAT_LABELS, SKILL_SOURCE_LABELS } from '../../core/models';
import { AXIS_LABEL, CHART_COLORS, LEGEND_TEXT, TOOLTIP } from '../../core/ui/chart-theme';
import { KpiCard } from '../../shared/ui/kpi-card';
import { PageHeader } from '../../shared/ui/page-header';
import { SkillBar } from '../../shared/ui/skill-bar';

@Component({
  selector: 'wa-employee-dashboard',
  imports: [
    RouterLink,
    DatePipe,
    DecimalPipe,
    PercentPipe,
    MatButtonModule,
    MatProgressBarModule,
    NgxEchartsDirective,
    KpiCard,
    PageHeader,
    SkillBar,
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmployeeDashboard {
  private readonly data = inject(DataService);
  private readonly auth = inject(AuthService);

  readonly user = this.auth.user;
  readonly isEmployee = computed(() => this.auth.role() === 'EMPLOYEE');

  /** Le jeu de démonstration décrit un seul collaborateur : on l'annonce
      explicitement quand la page est consultée par un autre rôle. */
  readonly heading = computed(() => {
    if (this.isEmployee()) {
      return `Bonjour ${this.user()?.name?.split(' ')?.[0] ?? ''} 👋`;
    }
    return 'Vue d’ensemble de la cohorte pilote';
  });

  readonly subtitle = computed(() =>
    this.isEmployee()
      ? 'Voici l’état de vos compétences, les écarts identifiés et la suite de votre parcours de développement.'
      : 'Synthèse du collaborateur pilote : compétences estimées, écarts, parcours en cours et preuves associées.',
  );

  readonly skills = this.data.skills;
  readonly course = this.data.activeCourse;
  readonly averageLevel = this.data.averageLevel;
  readonly averageGap = this.data.averageGap;
  readonly certificates = this.data.certificates;
  readonly sources = this.data.sources;
  readonly formatLabels = FORMAT_LABELS;
  readonly sourceLabels = SKILL_SOURCE_LABELS;

  /** Compétences les plus en retard, limitées à cinq pour la lisibilité. */
  readonly prioritySkills = computed(() =>
    [...this.skills()]
      .sort((a, b) => b.target - b.level - (a.target - a.level))
      .slice(0, 5),
  );

  readonly strengths = computed(() =>
    [...this.skills()].sort((a, b) => b.level - a.level).slice(0, 3),
  );

  readonly radarOptions = computed(() => {
    const shortLabel = (label: string): string =>
      label.startsWith('CI/CD') ? 'CI/CD' : label === 'Tests automatisés' ? 'Tests' : label;

    const skills = this.skills().slice(0, 6);
    return {
      tooltip: { ...TOOLTIP, trigger: 'item' },
      legend: {
        bottom: 0,
        icon: 'circle',
        itemWidth: 9,
        itemHeight: 9,
        itemGap: 18,
        textStyle: LEGEND_TEXT,
      },
      radar: {
        indicator: skills.map((skill) => ({ name: shortLabel(skill.label), max: 100 })),
        radius: '60%',
        center: ['50%', '47%'],
        axisName: { color: CHART_COLORS.axis, fontSize: 11 },
        splitLine: { lineStyle: { color: CHART_COLORS.grid } },
        splitArea: { areaStyle: { color: [CHART_COLORS.surface, '#ffffff'] } },
        axisLine: { lineStyle: { color: CHART_COLORS.grid } },
      },
      series: [
        {
          type: 'radar',
          symbolSize: 5,
          data: [
            {
              value: skills.map((skill) => skill.level),
              name: 'Niveau estimé',
              areaStyle: { color: 'rgba(47, 84, 235, 0.16)' },
              lineStyle: { color: CHART_COLORS.primary, width: 2 },
              itemStyle: { color: CHART_COLORS.primary },
            },
            {
              value: skills.map((skill) => skill.target),
              name: 'Cible du poste',
              areaStyle: { color: 'rgba(124, 58, 237, 0.07)' },
              lineStyle: { color: CHART_COLORS.violet, width: 2, type: 'dashed' },
              itemStyle: { color: CHART_COLORS.violet },
            },
          ],
        },
      ],
    };
  });

  readonly gapOptions = computed(() => {
    const skills = this.prioritySkills();
    return {
      grid: { left: 8, right: 24, top: 10, bottom: 36, containLabel: true },
      tooltip: { ...TOOLTIP, trigger: 'axis', axisPointer: { type: 'shadow' } },
      xAxis: {
        type: 'value',
        max: 100,
        axisLabel: AXIS_LABEL,
        splitLine: { lineStyle: { color: CHART_COLORS.grid, type: 'dashed' } },
      },
      yAxis: {
        type: 'category',
        data: skills.map((skill) => skill.label).reverse(),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: AXIS_LABEL,
      },
      series: [
        {
          name: 'Niveau estimé',
          type: 'bar',
          data: skills.map((skill) => skill.level).reverse(),
          barWidth: 9,
          itemStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 1,
              y2: 0,
              colorStops: [
                { offset: 0, color: CHART_COLORS.primary },
                { offset: 1, color: CHART_COLORS.violet },
              ],
            },
            borderRadius: [0, 4, 4, 0],
          },
        },
        {
          name: 'Cible',
          type: 'bar',
          data: skills.map((skill) => skill.target).reverse(),
          barWidth: 9,
          itemStyle: { color: CHART_COLORS.track, borderRadius: [0, 4, 4, 0] },
        },
      ],
      legend: {
        bottom: 0,
        icon: 'circle',
        itemWidth: 9,
        itemHeight: 9,
        textStyle: LEGEND_TEXT,
      },
    };
  });

  initials(name: string | undefined): string {
    if (!name) {
      return '—';
    }
    return name
      .split(' ')
      .map((part) => part.charAt(0))
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }
}
