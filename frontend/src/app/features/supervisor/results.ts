import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EVALUATION_METHOD_LABELS, EvaluationReport } from '../../core/models';
import { DataService } from '../../core/data/data.service';

@Component({
  selector: 'wa-results-page',
  imports: [RouterLink],
  styleUrl: '../pages.scss',
  template: `
    <div class="page">
      <header class="page-head">
        <div>
          <h1>Résultats d’évaluation</h1>
          <p>
            Chaque résultat provient d’une évaluation réellement passée après la fin de la
            formation. Le score, le seuil et le niveau avant/après sont conservés. Aucun
            certificat n’est émis sans réussite.
          </p>
        </div>
      </header>

      <div class="stat-grid">
        <div class="stat">
          <span>Résultats</span>
          <strong>{{ reports().length }}</strong>
          <small>Évaluations corrigées</small>
        </div>
        <div class="stat">
          <span>Taux de réussite</span>
          <strong>{{ passRate() }} %</strong>
          <small>Score ≥ seuil de la formation</small>
        </div>
        <div class="stat">
          <span>Score moyen</span>
          <strong>{{ average() }}/100</strong>
          <small>Sur les résultats enregistrés</small>
        </div>
        <div class="stat">
          <span>Certificats</span>
          <strong>{{ certificates().length }}</strong>
          <small>Adossés à une réussite</small>
        </div>
      </div>

      <section class="panel">
        <div class="toolbar" style="margin-bottom: 14px">
          <div class="filters">
            @for (filter of filters; track filter.value) {
              <button type="button" class="filter" [class.filter--on]="active() === filter.value" (click)="active.set(filter.value)">
                {{ filter.label }}
              </button>
            }
          </div>
          <div class="toolbar__spacer"></div>
          <span class="wa-small wa-muted">{{ filtered().length }} résultat(s)</span>
        </div>

        <div class="list">
          @for (report of filtered(); track report.id) {
            <article class="result" [class.result--fail]="report.decision !== 'REUSSI'">
              <div class="result__score">
                <strong>{{ report.score }}</strong>
                <small>/100</small>
              </div>
              <div class="result__body">
                <div class="chips">
                  <span class="wa-chip" [class]="report.decision === 'REUSSI' ? 'wa-chip wa-chip--success' : 'wa-chip wa-chip--danger'">
                    {{ report.decision === 'REUSSI' ? 'Réussi' : 'Non réussi' }}
                  </span>
                  <span class="wa-chip wa-chip--neutral">{{ methodLabels[report.method] }}</span>
                  <span class="wa-chip wa-chip--neutral">Tentative {{ report.attempt }}</span>
                </div>
                <h3>{{ titleFor(report) }}</h3>
                <p class="wa-small wa-muted">
                  Seuil {{ report.passScore }}/100 · niveau {{ report.levelBefore }} →
                  {{ report.levelAfter }}/100 · {{ when(report.at) }}
                </p>
                <div class="result__criteria">
                  @for (criterion of report.criteria.slice(0, 4); track criterion.id) {
                    <div class="crit">
                      <span>{{ criterion.label }}</span>
                      <strong>{{ criterion.earned }}/{{ criterion.max }}</strong>
                    </div>
                  }
                </div>
              </div>
              <div class="result__side">
                @if (certificateFor(report.requestId); as certificate) {
                  <a class="btn btn--primary btn--small" [routerLink]="['/app/certificats', certificate.id]">
                    <span class="material-symbols-outlined">workspace_premium</span>
                    Certificat
                  </a>
                } @else {
                  <span class="wa-chip wa-chip--warning">Sans certificat</span>
                }
                <a class="btn btn--small" [routerLink]="['/app/evaluations', report.requestId]">
                  Voir l’épreuve
                </a>
                <a class="btn btn--ghost btn--small" [routerLink]="['/app/formations', report.requestId]">
                  Parcours
                </a>
              </div>
            </article>
          }
          @if (filtered().length === 0) {
            <p class="empty">Aucun résultat dans ce filtre.</p>
          }
        </div>
      </section>

      <section class="panel">
        <h2>Règle de lecture</h2>
        <div class="split--even">
          <div class="kv">
            <span>Score et seuil</span>
            <strong>Le seuil est défini par la formation.</strong>
            <p class="wa-small wa-muted" style="margin: 4px 0 0">
              Un score de 78 peut réussir une formation à 75 et échouer une formation à 80.
            </p>
          </div>
          <div class="kv">
            <span>Échec</span>
            <strong>Aucun certificat, remédiation créée.</strong>
            <p class="wa-small wa-muted" style="margin: 4px 0 0">
              La remédiation est un nouveau parcours soumis au superviseur, pas un ajout à
              l’évaluation échouée.
            </p>
          </div>
        </div>
      </section>
    </div>
  `,
  styles: [
    `
      .result {
        display: flex;
        gap: 16px;
        align-items: flex-start;
        padding: 14px 16px;
        border-radius: 13px;
        border: 1px solid var(--wa-border);
        background: #fff;
        border-left: 4px solid var(--wa-success);
      }
      .result--fail {
        border-left-color: var(--wa-danger);
        background: #fffcfc;
      }
      .result__score {
        display: flex;
        align-items: baseline;
        gap: 2px;
        flex: none;
        padding: 10px 14px;
        border-radius: 11px;
        background: var(--wa-surface-2);
      }
      .result__score strong {
        font-size: 24px;
        letter-spacing: -0.02em;
      }
      .result__score small {
        font-size: 10px;
        color: var(--wa-ink-soft);
      }
      .result__body {
        flex: 1;
        min-width: 0;
      }
      .result h3 {
        margin: 7px 0 2px;
        font-size: 14px;
      }
      .result__criteria {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
        gap: 5px;
        margin-top: 9px;
      }
      .crit {
        display: flex;
        justify-content: space-between;
        gap: 8px;
        padding: 5px 9px;
        border-radius: 8px;
        background: var(--wa-surface-2);
        font-size: 11px;
      }
      .crit span {
        color: var(--wa-ink-soft);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .result__side {
        display: flex;
        flex-direction: column;
        gap: 6px;
        flex: none;
        align-items: flex-end;
      }
      @media (max-width: 700px) {
        .result {
          flex-direction: column;
        }
        .result__side {
          width: 100%;
          flex-direction: row;
          flex-wrap: wrap;
          align-items: center;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResultsPage {
  private readonly data = inject(DataService);

  readonly reports = computed(() =>
    [...this.data.supervisorReports()].sort((a, b) => b.at.localeCompare(a.at)),
  );
  readonly certificates = this.data.supervisorCertificates;
  readonly methodLabels = EVALUATION_METHOD_LABELS;

  readonly filters: { value: 'ALL' | 'REUSSI' | 'ECHOUE'; label: string }[] = [
    { value: 'ALL', label: 'Tous' },
    { value: 'REUSSI', label: 'Réussis' },
    { value: 'ECHOUE', label: 'Échoués' },
  ];

  readonly active = signal<'ALL' | 'REUSSI' | 'ECHOUE'>('ALL');

  readonly filtered = computed(() => {
    const filter = this.active();
    return filter === 'ALL'
      ? this.reports()
      : this.reports().filter((report) => report.decision === filter);
  });

  readonly average = computed(() => {
    const reports = this.reports();
    return reports.length === 0
      ? 0
      : Math.round(reports.reduce((sum, report) => sum + report.score, 0) / reports.length);
  });

  readonly passRate = computed(() => {
    const reports = this.reports();
    if (reports.length === 0) {
      return 0;
    }
    return Math.round(
      (reports.filter((report) => report.decision === 'REUSSI').length / reports.length) * 100,
    );
  });

  titleFor(report: EvaluationReport): string {
    return this.data.programFor(report.requestId)?.title ?? report.requestId;
  }

  certificateFor(requestId: string) {
    return this.data.certificateFor(requestId);
  }

  when(value: string): string {
    return new Date(value).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }
}
