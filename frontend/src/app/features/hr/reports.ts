import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DataService } from '../../core/data/data.service';
import { PageHeader } from '../../shared/ui/page-header';

/** Rapports et exports de démonstration (CSV et PDF simulés). */
@Component({
  selector: 'wa-hr-reports',
  imports: [DatePipe, FormsModule, MatButtonModule, PageHeader],
  templateUrl: './reports.html',
  styleUrl: './reports.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HrReports {
  private readonly data = inject(DataService);
  private readonly snack = inject(MatSnackBar);

  readonly reports = this.data.reportExports;

  readonly title = signal('Rapport de cohorte');
  readonly period = signal('01/11/2026 – 30/11/2026');
  readonly scope = signal('Tous les départements');
  readonly format = signal<'CSV' | 'PDF'>('PDF');

  readonly scopes = computed(() => [
    'Tous les départements',
    ...Array.from(new Set(this.data.team().map((member) => member.department))).sort(),
  ]);

  readonly totalRecords = computed(() =>
    this.reports().reduce((sum, report) => sum + report.records, 0),
  );

  generate(): void {
    const report = this.data.generateReport({
      title: this.title().trim() || 'Rapport de cohorte',
      period: this.period(),
      scope: this.scope(),
      format: this.format(),
    });
    this.snack.open(
      `Rapport « ${report.title} » généré (${report.format}, ${report.records} lignes). Export simulé en démonstration.`,
      'Fermer',
      { duration: 5200 },
    );
  }

  download(reportTitle: string, reportFormat: string): void {
    this.snack.open(
      `Téléchargement simulé : ${reportTitle} (${reportFormat}). Aucun fichier réel n’est produit en mode démonstration.`,
      'Fermer',
      { duration: 4800 },
    );
  }
}
