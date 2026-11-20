import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FORMAT_LABELS, Kpi } from '../../core/models';
import { DataService } from '../../core/data/data.service';
import { KpiCard } from '../../shared/ui/kpi-card';

@Component({
  selector: 'wa-hr-dashboard',
  imports: [RouterLink, KpiCard],
  styleUrl: '../pages.scss',
  template: `
    <div class="page">
      <header class="page-head">
        <div>
          <h1>Pilotage RH</h1>
          <p>
            Vue agrégée, non nominative. Aucun niveau individuel, aucun écart nominatif, aucun
            résultat d’évaluation rattaché à une personne n’apparaît ici. Les RH pilotent les
            besoins collectifs, pas les trajectoires individuelles.
          </p>
        </div>
        <div class="page-head__actions">
          <span class="wa-chip wa-chip--success">Agrégé · non nominatif</span>
          <a class="btn" routerLink="/app/rh/rapports">
            <span class="material-symbols-outlined">summarize</span>
            Rapports
          </a>
        </div>
      </header>

      <div class="wa-grid wa-grid--kpi">
        <wa-kpi-card
          label="Boucles terminées"
          [value]="kpi('LOOP_COMPLETION').current"
          unit=" %"
          icon="loop"
          tone="blue"
          [hint]="'Cible ' + kpi('LOOP_COMPLETION').target + ' % · boucles complètes / commencées'"
        />
        <wa-kpi-card
          label="Réduction des écarts"
          [value]="kpi('GAP_REDUCTION').current"
          unit=" %"
          icon="trending_down"
          tone="green"
          [hint]="'Cible ' + kpi('GAP_REDUCTION').target + ' % · écart initial vers écart final'"
        />
        <wa-kpi-card
          label="Réussite aux évaluations"
          [value]="kpi('EVAL_SUCCESS').current"
          unit=" %"
          icon="grading"
          tone="violet"
          [hint]="'Cible ' + kpi('EVAL_SUCCESS').target + ' % · évaluations réussies / réalisées'"
        />
        <wa-kpi-card
          label="Complétion des formations"
          [value]="kpi('COMPLETION_RATE').current"
          unit=" %"
          icon="school"
          tone="amber"
          [hint]="'Cible ' + kpi('COMPLETION_RATE').target + ' % · formations terminées / approuvées'"
        />
      </div>

      <div class="split">
        <div style="display: flex; flex-direction: column; gap: 18px">
          <section class="panel">
            <h2>Boucle de développement</h2>
            <p class="panel__sub">
              Chaque étape est un volume agrégé. Un écart peut rester en attente pendant une
              formation : la collecte ne s’arrête jamais.
            </p>
            <div class="funnel">
              @for (step of funnel(); track step.label; let i = $index) {
                <div class="funnel__step">
                  <div class="funnel__num">{{ step.value }}</div>
                  <div class="funnel__body">
                    <strong>{{ step.label }}</strong>
                    <small>{{ step.hint }}</small>
                  </div>
                  @if (i < funnel().length - 1) {
                    <span class="funnel__arrow material-symbols-outlined">south</span>
                  }
                </div>
              }
            </div>
          </section>

          <section class="panel">
            <div class="toolbar" style="margin-bottom: 10px">
              <h2 style="margin: 0">Besoins de formation prioritaires</h2>
              <div class="toolbar__spacer"></div>
              <a class="btn btn--small" routerLink="/app/rh/besoins">Tous les besoins</a>
            </div>
            <div class="list">
              @for (need of topNeeds(); track need.id) {
                <div class="row">
                  <span class="icon-round material-symbols-outlined">school</span>
                  <div class="row__main">
                    <strong>{{ need.skill }}</strong>
                    <p>
                      {{ need.department }} · {{ need.employeesConcerned }} personnes concernées ·
                      écart moyen {{ need.averageGap }} pts
                    </p>
                  </div>
                  <div class="chips">
                    @for (format of need.recommendedFormats; track format) {
                      <span class="wa-chip wa-chip--neutral">{{ formatLabels[format] }}</span>
                    }
                  </div>
                </div>
              }
            </div>
          </section>

          <section class="panel">
            <h2>Les 13 KPI du CDC</h2>
            <p class="panel__sub">Valeurs agrégées, définitions conservées, cibles explicites.</p>
            <div class="kpi-table">
              @for (item of kpis; track item.code) {
                <div class="kpi-row">
                  <div class="kpi-row__main">
                    <strong>{{ item.label }}</strong>
                    <small>{{ item.definition }}</small>
                  </div>
                  <div class="kpi-row__bar">
                    <div class="bar" [class.bar--success]="isOnTarget(item)" [class.bar--warning]="!isOnTarget(item)">
                      <span [style.width.%]="barWidth(item)"></span>
                    </div>
                  </div>
                  <div class="kpi-row__value" [class.kpi-row__value--off]="!isOnTarget(item)">
                    {{ item.current }}{{ unit(item) }}
                    <small>cible {{ item.target }}{{ unit(item) }}</small>
                  </div>
                </div>
              }
            </div>
          </section>
        </div>

        <div style="display: flex; flex-direction: column; gap: 18px">
          <section class="panel">
            <h2>Répartition des formats</h2>
            <p class="panel__sub">
              Le format est choisi selon la nature de l’écart, pas selon une préférence unique.
            </p>
            <div class="format-list">
              @for (row of formatMix(); track row.format) {
                <div class="format-row">
                  <span>{{ formatLabels[row.format] }}</span>
                  <div class="bar"><span [style.width.%]="row.share"></span></div>
                  <strong>{{ row.count }}</strong>
                </div>
              }
            </div>
            <p class="note" style="margin-top: 10px">
              Un parcours = un format dominant et au maximum deux activités complémentaires
              rendues dans leur composant natif.
            </p>
          </section>

          <section class="panel">
            <h2>Accès rapides</h2>
            <div class="quick">
              <a class="quick__item" routerLink="/app/rh/tendances">
                <span class="material-symbols-outlined">trending_up</span>
                <div>
                  <strong>Tendances par compétence</strong>
                  <small>Évolution agrégée sur six mois</small>
                </div>
              </a>
              <a class="quick__item" routerLink="/app/rh/certifications">
                <span class="material-symbols-outlined">workspace_premium</span>
                <div>
                  <strong>Certifications</strong>
                  <small>Volumes par compétence et méthode</small>
                </div>
              </a>
              <a class="quick__item" routerLink="/app/rh/rapports">
                <span class="material-symbols-outlined">summarize</span>
                <div>
                  <strong>Rapports et exports</strong>
                  <small>Exports simulés, agrégés et étiquetés</small>
                </div>
              </a>
            </div>
          </section>

          <section class="panel">
            <h2>Ce que cette vue ne permet pas</h2>
            <ul class="rules">
              <li>Identifier un employé à partir d’un écart ou d’un score.</li>
              <li>Comparer deux personnes entre elles.</li>
              <li>Décider d’une promotion ou d’une sanction.</li>
              <li>Accéder aux réponses détaillées d’une évaluation.</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .funnel {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .funnel__step {
        position: relative;
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 12px;
        border-radius: 11px;
        border: 1px solid var(--wa-border);
        background: #fff;
      }
      .funnel__num {
        width: 46px;
        height: 40px;
        flex: none;
        border-radius: 10px;
        background: var(--wa-primary-soft);
        color: var(--wa-primary-deep);
        display: grid;
        place-items: center;
        font-size: 17px;
        font-weight: 700;
      }
      .funnel__body strong {
        display: block;
        font-size: 12.5px;
      }
      .funnel__body small {
        font-size: 10.5px;
        color: var(--wa-ink-soft);
      }
      .funnel__arrow {
        position: absolute;
        left: 31px;
        bottom: -11px;
        font-size: 15px;
        color: var(--wa-ink-faint);
        z-index: 1;
      }
      .kpi-table {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .kpi-row {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 7px 9px;
        border-radius: 9px;
        background: var(--wa-surface-2);
      }
      .kpi-row__main {
        flex: 1.4;
        min-width: 0;
      }
      .kpi-row__main strong {
        display: block;
        font-size: 11.5px;
      }
      .kpi-row__main small {
        font-size: 10px;
        color: var(--wa-ink-faint);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        display: block;
      }
      .kpi-row__bar {
        flex: 1;
        min-width: 60px;
      }
      .kpi-row__value {
        flex: none;
        width: 78px;
        text-align: right;
        font-size: 12.5px;
        font-weight: 700;
        color: #0a6b3d;
      }
      .kpi-row__value--off {
        color: #a21c12;
      }
      .kpi-row__value small {
        display: block;
        font-size: 9px;
        font-weight: 600;
        color: var(--wa-ink-faint);
      }
      .format-list {
        display: flex;
        flex-direction: column;
        gap: 7px;
      }
      .format-row {
        display: grid;
        grid-template-columns: 88px 1fr 24px;
        gap: 9px;
        align-items: center;
        font-size: 11.5px;
      }
      .format-row strong {
        text-align: right;
      }
      .quick {
        display: flex;
        flex-direction: column;
        gap: 7px;
      }
      .quick__item {
        display: flex;
        gap: 9px;
        align-items: center;
        padding: 9px 11px;
        border-radius: 10px;
        border: 1px solid var(--wa-border);
        text-decoration: none;
        color: inherit;
      }
      .quick__item:hover {
        background: var(--wa-surface-2);
      }
      .quick__item .material-symbols-outlined {
        color: var(--wa-primary-deep);
        font-size: 20px;
      }
      .quick__item strong {
        display: block;
        font-size: 12px;
      }
      .quick__item small {
        font-size: 10.5px;
        color: var(--wa-ink-soft);
      }
      .rules {
        margin: 0;
        padding-left: 18px;
        font-size: 12px;
        line-height: 1.7;
        color: var(--wa-ink-soft);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HrDashboard {
  private readonly data = inject(DataService);

  readonly kpis = this.data.kpis;
  readonly needs = this.data.needs;
  readonly formatLabels = FORMAT_LABELS;

  readonly topNeeds = computed(() =>
    [...this.needs]
      .sort((a, b) => b.averageGap * b.employeesConcerned - a.averageGap * a.employeesConcerned)
      .slice(0, 3),
  );

  readonly funnel = computed(() => [
    {
      label: 'Écarts détectés',
      value: this.data.gaps().length,
      hint: 'Toutes origines confondues : collecte, entretien, veille.',
    },
    {
      label: 'Parcours générés',
      value: this.data.requests().length,
      hint: 'Curriculum complet produit avant validation.',
    },
    {
      label: 'Parcours approuvés',
      value: this.data.requests().filter((request) => request.status !== 'PENDING' && request.status !== 'REJECTED').length,
      hint: 'Décision humaine tracée.',
    },
    {
      label: 'Formations terminées',
      value: this.data.completedTrainings().length,
      hint: 'Preuve de fin déposée, conditions réelles atteintes.',
    },
    {
      label: 'Évaluations corrigées',
      value: this.data.evaluationReports().length,
      hint: 'Chaque résultat provient d’une épreuve réellement passée.',
    },
    {
      label: 'Certificats délivrés',
      value: this.data.issuedCertificates().length,
      hint: 'Uniquement après réussite au seuil de la formation.',
    },
  ]);

  readonly formatMix = computed(() => {
    const requests = this.data.requests();
    const total = Math.max(1, requests.length);
    return this.data.formats.map((format) => {
      const count = requests.filter((request) => request.format === format).length;
      return { format, count, share: Math.round((count / total) * 100) };
    });
  });

  kpi(code: string): Kpi {
    return this.data.kpiByCode()[code] ?? this.kpis[0];
  }

  isOnTarget(kpi: Kpi): boolean {
    return kpi.direction === 'UP' ? kpi.current >= kpi.target : kpi.current <= kpi.target;
  }

  barWidth(kpi: Kpi): number {
    const reference = Math.max(kpi.target, kpi.current, 1);
    return Math.min(100, Math.round((kpi.current / reference) * 100));
  }

  unit(kpi: Kpi): string {
    return kpi.unit === 'PERCENT'
      ? ' %'
      : kpi.unit === 'POINTS'
        ? ' pts'
        : kpi.unit === 'MINUTES'
          ? ' min'
          : ' s';
  }
}
