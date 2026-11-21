import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ReportExport } from '../../core/models';
import { DataService } from '../../core/data/data.service';

type ReportKind = 'KPI' | 'NEEDS' | 'CERTIFICATIONS' | 'AUDIT';

interface ExportResult {
  type: 'CSV' | 'PDF';
  title: string;
  period: string;
  scope: string;
  records: number;
  generatedAt: string;
}

@Component({
  selector: 'wa-hr-reports-page',
  styleUrl: '../pages.scss',
  template: `
    <div class="page">
      <header class="page-head">
        <div>
          <h1>Rapports et exports</h1>
          <p>
            Les exports sont simulés : aucun fichier réel n’est produit sans service serveur. Chaque
            export est étiqueté comme tel, agrégé et non nominatif. Un CSV ne contient jamais de
            nom d’employé ni de score individuel.
          </p>
        </div>
        <div class="page-head__actions">
          <span class="wa-chip wa-chip--warning">Exports simulés</span>
          <span class="wa-chip wa-chip--success">Agrégé · non nominatif</span>
        </div>
      </header>

      @if (message()) {
        <p class="note" [class.note--ok]="messageOk()" [class.note--danger]="!messageOk()">
          {{ message() }}
        </p>
      }

      <div class="stat-grid">
        <div class="stat">
          <span>Exports disponibles</span>
          <strong>{{ exportsList().length }}</strong>
          <small>Historique simulé</small>
        </div>
        <div class="stat">
          <span>CSV</span>
          <strong>{{ countType('CSV') }}</strong>
          <small>Données tabulaires agrégées</small>
        </div>
        <div class="stat">
          <span>PDF</span>
          <strong>{{ countType('PDF') }}</strong>
          <small>Synthèses mises en page</small>
        </div>
        <div class="stat">
          <span>Lignes couvertes</span>
          <strong>{{ totalRecords() }}</strong>
          <small>Cumul des exports listés</small>
        </div>
      </div>

      <div class="split">
        <div style="display: flex; flex-direction: column; gap: 18px">
          <section class="panel">
            <h2>Générer un export</h2>
            <p class="panel__sub">
              Choisissez le contenu, la période et le format. Le nombre de lignes est calculé à
              partir des données agrégées disponibles.
            </p>
            <div class="form-grid form-grid--2">
              <label class="wa-field">
                <span class="wa-field__label">Contenu</span>
                <select class="wa-select" [value]="kind()" (change)="kind.set($any($event.target).value)">
                  @for (option of kinds; track option.value) {
                    <option [value]="option.value">{{ option.label }}</option>
                  }
                </select>
              </label>
              <label class="wa-field">
                <span class="wa-field__label">Format</span>
                <select class="wa-select" [value]="format()" (change)="format.set($any($event.target).value)">
                  <option value="CSV">CSV</option>
                  <option value="PDF">PDF</option>
                </select>
              </label>
              <label class="wa-field">
                <span class="wa-field__label">Période</span>
                <select class="wa-select" [value]="period()" (change)="period.set($any($event.target).value)">
                  @for (option of periods; track option) {
                    <option [value]="option">{{ option }}</option>
                  }
                </select>
              </label>
              <label class="wa-field">
                <span class="wa-field__label">Périmètre</span>
                <select class="wa-select" [value]="scope()" (change)="scope.set($any($event.target).value)">
                  @for (option of scopes(); track option) {
                    <option [value]="option">{{ option }}</option>
                  }
                </select>
              </label>
            </div>

            <div class="estimate">
              <span class="material-symbols-outlined">table_view</span>
              <div>
                <strong>{{ estimatedRecords() }} ligne(s) agrégée(s)</strong>
                <small>{{ kindLabel() }} · {{ period() }} · {{ scope() }} · {{ format() }}</small>
              </div>
            </div>

            <button class="btn btn--primary" type="button" style="margin-top: 10px" (click)="generate()">
              <span class="material-symbols-outlined">output</span>
              Générer l’export (simulé)
            </button>
          </section>

          <section class="panel">
            <div class="toolbar" style="margin-bottom: 12px">
              <h2 style="margin: 0">Historique des exports</h2>
              <div class="toolbar__spacer"></div>
              <span class="wa-small wa-muted">{{ exportsList().length }} export(s)</span>
            </div>
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Titre</th>
                    <th>Période</th>
                    <th>Périmètre</th>
                    <th>Format</th>
                    <th>Généré le</th>
                    <th>Lignes</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  @for (item of exportsList(); track item.id) {
                    <tr>
                      <td><strong>{{ item.title }}</strong></td>
                      <td class="wa-small">{{ item.period }}</td>
                      <td class="wa-small">{{ item.scope }}</td>
                      <td>
                        <span class="wa-chip" [class]="item.format === 'CSV' ? 'wa-chip wa-chip--info' : 'wa-chip wa-chip--neutral'">
                          {{ item.format }}
                        </span>
                      </td>
                      <td class="wa-small">{{ item.generatedAt }}</td>
                      <td>{{ item.records }}</td>
                      <td>
                        <div class="row-actions">
                          <button class="btn btn--ghost btn--small" type="button" (click)="preview(item)">
                            Aperçu
                          </button>
                          <button class="btn btn--small" type="button" (click)="download(item)">
                            Télécharger (simulé)
                          </button>
                        </div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
            <p class="wa-small wa-muted" style="margin: 8px 0 0">
              Chaque export est conservé avec sa date, son périmètre et son nombre de lignes.
              Aucun export ne peut être modifié après génération.
            </p>
          </section>
        </div>

        <div style="display: flex; flex-direction: column; gap: 18px">
          @if (previewData(); as preview) {
            <section class="panel">
              <h2>Aperçu simulé</h2>
              <p class="panel__sub">{{ preview.title }} · {{ preview.format }} · {{ preview.records }} lignes</p>
              <pre class="preview">{{ previewText() }}</pre>
              <button class="btn btn--small" type="button" style="margin-top: 8px" (click)="clearPreview()">
                Fermer l’aperçu
              </button>
            </section>
          } @else {
            <section class="panel">
              <h2>Aucun aperçu ouvert</h2>
              <p class="panel__sub" style="margin-bottom: 0">
                Sélectionnez « Aperçu » sur un export pour voir la structure réelle des colonnes.
                Le contenu reste agrégé et étiqueté comme simulé.
              </p>
            </section>
          }

          <section class="panel">
            <h2>Contenu autorisé</h2>
            <ul class="rules">
              <li>Volumes d’écarts par compétence et département.</li>
              <li>Besoins agrégés, effectifs concernés et écarts moyens.</li>
              <li>Volumes de formations et de certifications par format.</li>
              <li>Valeurs des 13 KPI et cibles.</li>
              <li>Statistiques des flux de travail et temps de traitement.</li>
            </ul>
          </section>

          <section class="panel">
            <h2>Contenu interdit</h2>
            <ul class="rules rules--danger">
              <li>Nom, e-mail ou identifiant d’un employé.</li>
              <li>Score individuel ou réponse d’évaluation.</li>
              <li>Détail d’un écart rattaché à une personne.</li>
              <li>Classement individuel ou comparaison entre employés.</li>
            </ul>
          </section>

          <section class="panel">
            <h2>Traçabilité</h2>
            <p class="panel__sub" style="margin-bottom: 0">
              Toute génération d’export est censée être journalisée avec l’auteur, la date, le
              périmètre et le format. Dans cette démonstration, le journal est local et la
              génération reste simulée.
            </p>
          </section>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .estimate {
        display: flex;
        gap: 9px;
        align-items: center;
        margin-top: 12px;
        padding: 10px 12px;
        border-radius: 10px;
        background: var(--wa-surface-2);
      }
      .estimate .material-symbols-outlined {
        color: var(--wa-primary-deep);
        font-size: 20px;
      }
      .estimate strong {
        display: block;
        font-size: 12.5px;
      }
      .estimate small {
        font-size: 10.5px;
        color: var(--wa-ink-soft);
      }
      .row-actions {
        display: flex;
        gap: 5px;
        flex-wrap: wrap;
      }
      .preview {
        margin: 0;
        padding: 10px 12px;
        border-radius: 10px;
        background: #0f172a;
        color: #dbeafe;
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-size: 10.5px;
        line-height: 1.6;
        overflow-x: auto;
        white-space: pre;
      }
      .rules {
        margin: 0;
        padding-left: 18px;
        font-size: 12px;
        line-height: 1.7;
        color: var(--wa-ink-soft);
      }
      .rules--danger li {
        color: #a21c12;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HrReportsPage {
  private readonly data = inject(DataService);

  readonly kinds: { value: ReportKind; label: string }[] = [
    { value: 'KPI', label: 'Synthèse des 13 KPI' },
    { value: 'NEEDS', label: 'Besoins de formation agrégés' },
    { value: 'CERTIFICATIONS', label: 'Certifications par compétence' },
    { value: 'AUDIT', label: 'Journal des décisions' },
  ];
  readonly periods = ['Novembre 2026', 'Septembre - Novembre 2026', 'Trois derniers mois'];
  readonly format = signal<'CSV' | 'PDF'>('CSV');
  readonly period = signal(this.periods[0]);
  readonly scope = signal('Organisation');
  readonly kind = signal<ReportKind>('KPI');
  readonly message = signal('');
  readonly messageOk = signal(true);

  readonly exportsList = signal<ReportExport[]>([...this.data.reports]);
  readonly previewData = signal<ReportExport | undefined>(undefined);
  readonly previewText = signal('');

  readonly scopes = computed(() => [
    'Organisation',
    ...new Set(this.data.needs.map((need) => need.department)),
  ]);

  readonly totalRecords = computed(() =>
    this.exportsList().reduce((sum, item) => sum + item.records, 0),
  );

  readonly estimatedRecords = computed(() => {
    switch (this.kind()) {
      case 'NEEDS':
        return this.data.needs.length;
      case 'CERTIFICATIONS':
        return new Set(this.data.issuedCertificates().map((cert) => cert.skillLabel)).size;
      case 'AUDIT':
        return this.data.auditEntries().length;
      default:
        return this.data.kpis.length;
    }
  });

  kindLabel(): string {
    return this.kinds.find((item) => item.value === this.kind())?.label ?? '';
  }

  countType(type: 'CSV' | 'PDF'): number {
    return this.exportsList().filter((item) => item.format === type).length;
  }

  generate(): void {
    const item: ExportResult = {
      type: this.format(),
      title: this.kindLabel(),
      period: this.period(),
      scope: this.scope(),
      records: this.estimatedRecords(),
      generatedAt: new Date().toISOString().slice(0, 10),
    };
    const exportItem: ReportExport = {
      id: `rpt-sim-${Date.now()}`,
      title: item.title,
      period: item.period,
      scope: item.scope,
      format: item.type,
      generatedAt: item.generatedAt,
      records: item.records,
    };
    this.exportsList.update((list) => [exportItem, ...list]);
    this.message.set(
      `Export simulé généré : ${item.title} (${item.type}, ${item.records} lignes, ${item.scope}). ` +
        'Aucun fichier réel n’a été téléchargé — un service serveur produira le document final.',
    );
    this.messageOk.set(true);
    this.setPreview(exportItem);
  }

  preview(item: ReportExport): void {
    this.setPreview(item);
    this.message.set(`Aperçu simulé de « ${item.title} » (${item.format}).`);
    this.messageOk.set(true);
  }

  download(item: ReportExport): void {
    this.message.set(
      `Téléchargement simulé de « ${item.title} » (${item.format}, ${item.records} lignes). ` +
        'Le fichier n’existe pas : seules les données agrégées sont listées ci-contre.',
    );
    this.messageOk.set(true);
    this.setPreview(item);
  }

  clearPreview(): void {
    this.previewData.set(undefined);
    this.previewText.set('');
  }

  private setPreview(item: ReportExport): void {
    this.previewData.set(item);
    this.previewText.set(this.buildPreview(item));
  }

  private buildPreview(item: ReportExport): string {
    const header = 'indicateur;valeur;cible;perimetre;statut';
    if (this.data.kpis.length === 0) {
      return header;
    }
    if (item.title.includes('besoins') || item.title.includes('Besoins')) {
      return [
        'competence;departement;personnes_concernees;ecart_moyen;priorite',
        ...this.data.needs.map(
          (need) =>
            `${need.skill};${need.department};${need.employeesConcerned};${need.averageGap};${need.priority}`,
        ),
      ].join('\n');
    }
    if (item.title.includes('Certifications')) {
      const grouped = new Map<string, number>();
      for (const cert of this.data.issuedCertificates()) {
        grouped.set(cert.skillLabel, (grouped.get(cert.skillLabel) ?? 0) + 1);
      }
      return [
        'competence;certificats;methode;formats',
        ...[...grouped.entries()].map(
          ([skill, count]) =>
            `${skill};${count};${new Set(
              this.data.issuedCertificates().filter((cert) => cert.skillLabel === skill).map((cert) => cert.method),
            ).size} methode(s);${new Set(
              this.data.issuedCertificates().filter((cert) => cert.skillLabel === skill).map((cert) => cert.format),
            ).size} format(s)`,
        ),
      ].join('\n');
    }
    if (item.title.includes('Journal')) {
      return [
        'horodatage;acteur;action;cible',
        ...this.data.auditEntries().map(
          (entry) => `${entry.at};${entry.actor};${entry.action};${entry.target}`,
        ),
      ].join('\n');
    }
    return [
      header,
      ...this.data.kpis.map(
        (kpi) =>
          `${kpi.code};${kpi.current};${kpi.target};${item.scope};${
            kpi.direction === 'UP'
              ? kpi.current >= kpi.target
                ? 'OK'
                : 'HORS_CIBLE'
              : kpi.current <= kpi.target
                ? 'OK'
                : 'HORS_CIBLE'
          }`,
      ),
    ].join('\n');
  }
}
