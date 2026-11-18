import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SkillTrendSeries } from '../../core/models';
import { DataService } from '../../core/data/data.service';

interface TrendCard {
  skill: string;
  points: { month: string; level: number }[];
  path: string;
  area: string;
  min: number;
  max: number;
  last: number;
  delta: number;
  direction: 'UP' | 'DOWN' | 'FLAT';
}

const WIDTH = 260;
const HEIGHT = 76;
const PAD = 6;

@Component({
  selector: 'wa-hr-trends-page',
  imports: [RouterLink],
  styleUrl: '../pages.scss',
  template: `
    <div class="page">
      <header class="page-head">
        <div>
          <h1>Tendances des compétences</h1>
          <p>
            Évolution agrégée sur six mois. Une courbe qui monte ne prouve pas qu’une formation a
            causé le progrès : elle indique une direction à confirmer par les évaluations et la
            collecte. Aucune tendance individuelle n’est exposée.
          </p>
        </div>
        <div class="page-head__actions">
          <span class="wa-chip wa-chip--success">Agrégé · non nominatif</span>
          <a class="btn" routerLink="/app/rh/besoins">
            <span class="material-symbols-outlined">school</span>
            Besoins liés
          </a>
        </div>
      </header>

      <div class="stat-grid">
        <div class="stat">
          <span>Compétences suivies</span>
          <strong>{{ cards().length }}</strong>
          <small>Séries agrégées</small>
        </div>
        <div class="stat">
          <span>En progression</span>
          <strong>{{ progressing() }}</strong>
          <small>Delta positif sur six mois</small>
        </div>
        <div class="stat">
          <span>Gain moyen</span>
          <strong>{{ averageGain() }} pts</strong>
          <small>Sur les séries suivies</small>
        </div>
        <div class="stat">
          <span>Amélioration après formation</span>
          <strong>{{ kpiValue('SKILL_GAIN') }} pts</strong>
          <small>Cible {{ kpiTarget('SKILL_GAIN') }} pts · KPI CDC</small>
        </div>
      </div>

      <div class="trend-grid">
        @for (card of cards(); track card.skill) {
          <section class="panel trend-card" [attr.data-direction]="card.direction">
            <div class="trend-card__head">
              <div>
                <h2>{{ card.skill }}</h2>
                <p class="panel__sub" style="margin: 0">
                  {{ card.min }} → {{ card.last }} pts sur six mois
                </p>
              </div>
              <span class="wa-chip" [class]="deltaClass(card)">
                {{ card.delta > 0 ? '+' : '' }}{{ card.delta }} pts
              </span>
            </div>

            <svg class="chart" [attr.viewBox]="'0 0 ' + width + ' ' + height" role="img" [attr.aria-label]="'Tendance agrégée pour ' + card.skill">
              <defs>
                <linearGradient [attr.id]="'grad-' + slug(card.skill)" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#2f54eb" stop-opacity="0.22" />
                  <stop offset="100%" stop-color="#2f54eb" stop-opacity="0" />
                </linearGradient>
              </defs>
              <line [attr.x1]="0" [attr.y1]="height - 4" [attr.x2]="width" [attr.y2]="height - 4" stroke="#e2e8f0" stroke-width="1" />
              <path [attr.d]="card.area" [attr.fill]="'url(#grad-' + slug(card.skill) + ')'" />
              <path [attr.d]="card.path" fill="none" stroke="#2f54eb" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
            </svg>

            <div class="months">
              @for (point of card.points; track point.month) {
                <span>{{ point.month.slice(0, 3) }}</span>
              }
            </div>

            <div class="trend-card__values">
              @for (point of card.points; track point.month) {
                <span [title]="point.month + ' : ' + point.level + ' pts'">{{ point.level }}</span>
              }
            </div>
          </section>
        }
      </div>

      <div class="split">
        <section class="panel">
          <h2>Lecture des tendances</h2>
          <p class="panel__sub">
            Une progression lente n’est pas un échec : elle peut signaler un écart structurel,
            un manque de pratique ou une technologie en cours d’adoption.
          </p>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Compétence</th>
                  <th>Début</th>
                  <th>Dernier</th>
                  <th>Delta</th>
                  <th>Direction</th>
                </tr>
              </thead>
              <tbody>
                @for (card of cards(); track card.skill) {
                  <tr>
                    <td><strong>{{ card.skill }}</strong></td>
                    <td>{{ card.points[0].level }} pts</td>
                    <td>{{ card.last }} pts</td>
                    <td [class.gain]="card.delta > 0" [class.loss]="card.delta < 0">
                      {{ card.delta > 0 ? '+' : '' }}{{ card.delta }} pts
                    </td>
                    <td>
                      <span class="wa-chip" [class]="deltaClass(card)">
                        {{ directionLabel(card.direction) }}
                      </span>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </section>

        <div style="display: flex; flex-direction: column; gap: 18px">
          <section class="panel">
            <h2>Ce que la tendance ne dit pas</h2>
            <ul class="rules">
              <li>Elle ne prouve pas la causalité d’une formation.</li>
              <li>Elle ne remplace pas une évaluation individuelle.</li>
              <li>Elle ne permet pas de comparer deux employés.</li>
              <li>Elle ne doit pas servir à une décision de sanction.</li>
            </ul>
          </section>

          <section class="panel">
            <h2>Croisement avec les KPI</h2>
            <div class="kv-grid">
              <div class="kv">
                <span>Réduction des écarts</span>
                <strong>{{ kpiValue('GAP_REDUCTION') }} %</strong>
                <p class="wa-small wa-muted" style="margin: 3px 0 0">Cible {{ kpiTarget('GAP_REDUCTION') }} %</p>
              </div>
              <div class="kv">
                <span>Réussite aux évaluations</span>
                <strong>{{ kpiValue('EVAL_SUCCESS') }} %</strong>
                <p class="wa-small wa-muted" style="margin: 3px 0 0">Cible {{ kpiTarget('EVAL_SUCCESS') }} %</p>
              </div>
            </div>
            <p class="note" style="margin-top: 10px">
              Une tendance positive avec un taux d’échec élevé indique un problème de preuve, pas
              un problème d’apprentissage : la compétence n’est pas démontrée.
            </p>
          </section>

          <section class="panel">
            <h2>Prochaine étape</h2>
            <p class="panel__sub" style="margin-bottom: 10px">
              Les compétences en progression lente doivent être rapprochées des besoins agrégés
              pour décider d’un plan collectif.
            </p>
            <a class="btn btn--primary btn--small" routerLink="/app/rh/besoins">
              <span class="material-symbols-outlined">arrow_forward</span>
              Ouvrir les besoins
            </a>
          </section>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .trend-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 14px;
      }
      .trend-card__head {
        display: flex;
        justify-content: space-between;
        gap: 10px;
        align-items: flex-start;
        margin-bottom: 10px;
      }
      .trend-card__head h2 {
        margin: 0 0 2px;
      }
      .chart {
        width: 100%;
        height: 76px;
        display: block;
      }
      .months {
        display: flex;
        justify-content: space-between;
        margin-top: 4px;
        font-size: 9px;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--wa-ink-faint);
      }
      .trend-card__values {
        display: flex;
        justify-content: space-between;
        margin-top: 3px;
        font-size: 10px;
        font-weight: 700;
        color: var(--wa-ink-soft);
      }
      .gain {
        color: #0a6b3d;
        font-weight: 700;
      }
      .loss {
        color: #a21c12;
        font-weight: 700;
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
export class HrTrendsPage {
  private readonly data = inject(DataService);

  readonly width = WIDTH;
  readonly height = HEIGHT;

  readonly series = this.data.trends;
  readonly cards = computed(() => this.series.map((serie) => this.toCard(serie)));

  readonly progressing = computed(() => this.cards().filter((card) => card.delta > 0).length);
  readonly averageGain = computed(() => {
    const cards = this.cards();
    return cards.length === 0
      ? 0
      : Math.round(cards.reduce((sum, card) => sum + card.delta, 0) / cards.length);
  });

  private toCard(serie: SkillTrendSeries): TrendCard {
    const levels = serie.points.map((point) => point.level);
    const min = Math.min(...levels);
    const max = Math.max(...levels);
    const span = Math.max(1, max - min);
    const stepX = serie.points.length > 1 ? (WIDTH - PAD * 2) / (serie.points.length - 1) : 0;

    const coords = serie.points.map((point, index) => {
      const x = PAD + index * stepX;
      const y = HEIGHT - PAD - ((point.level - min) / span) * (HEIGHT - PAD * 2);
      return { x, y };
    });

    const path = coords
      .map((coord, index) => `${index === 0 ? 'M' : 'L'} ${coord.x.toFixed(1)} ${coord.y.toFixed(1)}`)
      .join(' ');
    const first = coords[0];
    const last = coords[coords.length - 1];
    const area = `${path} L ${last.x.toFixed(1)} ${HEIGHT} L ${first.x.toFixed(1)} ${HEIGHT} Z`;

    const delta = levels[levels.length - 1] - levels[0];
    return {
      skill: serie.skill,
      points: serie.points,
      path,
      area,
      min: levels[0],
      max,
      last: levels[levels.length - 1],
      delta,
      direction: delta > 0 ? 'UP' : delta < 0 ? 'DOWN' : 'FLAT',
    };
  }

  kpiValue(code: string): number {
    return this.data.kpiByCode()[code]?.current ?? 0;
  }

  kpiTarget(code: string): number {
    return this.data.kpiByCode()[code]?.target ?? 0;
  }

  slug(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]/g, '-')
      .toLowerCase();
  }

  directionLabel(direction: TrendCard['direction']): string {
    return direction === 'UP' ? 'Progression' : direction === 'DOWN' ? 'Recul' : 'Stable';
  }

  deltaClass(card: TrendCard): string {
    return card.direction === 'UP'
      ? 'wa-chip wa-chip--success'
      : card.direction === 'DOWN'
        ? 'wa-chip wa-chip--danger'
        : 'wa-chip wa-chip--neutral';
  }
}
