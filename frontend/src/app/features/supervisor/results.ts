import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { DataService } from '../../core/data/data.service';
import { FORMAT_LABELS } from '../../core/models';
import { KpiCard } from '../../shared/ui/kpi-card';
import { PageHeader } from '../../shared/ui/page-header';

/** Résultats et évaluations de l'équipe, par format (CDC §11.3). */
@Component({
  selector: 'wa-supervisor-results',
  imports: [DatePipe, KpiCard, PageHeader],
  templateUrl: './results.html',
  styleUrl: './results.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SupervisorResults {
  private readonly data = inject(DataService);

  readonly employeeFilter = signal('ALL');
  readonly formatFilter = signal('ALL');
  readonly formatLabel = FORMAT_LABELS;

  readonly results = this.data.evaluationResults;
  readonly formats = this.data.formats;

  readonly employees = computed(() =>
    Array.from(new Set(this.results().map((result) => result.employee))).sort(),
  );

  readonly filtered = computed(() =>
    this.results()
      .filter(
        (result) => this.employeeFilter() === 'ALL' || result.employee === this.employeeFilter(),
      )
      .filter(
        (result) => this.formatFilter() === 'ALL' || result.evaluationFormat === this.formatFilter(),
      )
      .sort((a, b) => b.at.localeCompare(a.at)),
  );

  readonly averageScore = computed(() => {
    const results = this.results();
    if (!results.length) {
      return 0;
    }
    return Math.round(results.reduce((sum, result) => sum + result.score, 0) / results.length);
  });

  readonly passRate = computed(() => {
    const results = this.results();
    if (!results.length) {
      return 0;
    }
    return Math.round((results.filter((result) => result.passed).length / results.length) * 100);
  });

  readonly certificates = computed(() => this.results().filter((result) => result.certificateId));
}
