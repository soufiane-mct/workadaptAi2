import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FORMAT_LABELS, GAP_LIFECYCLE_LABELS, GapLifecycle, SkillGap } from '../../core/models';
import { DataService } from '../../core/data/data.service';

@Component({
  selector: 'wa-gaps-page',
  imports: [RouterLink],
  styleUrl: '../pages.scss',
  template: `
    <div class="page">
      <header class="page-head">
        <div>
          <h1>Mes écarts de compétence</h1>
          <p>
            Un écart n’est pas une sanction : c’est la différence expliquée entre votre niveau
            estimé et le niveau attendu à votre poste. Chaque écart s’appuie sur des faits
            sourcés, jamais sur une impression.
          </p>
        </div>
        <div class="page-head__actions">
          <a class="btn" routerLink="/app/collecte">
            <span class="material-symbols-outlined">sensors</span>
            Voir la collecte
          </a>
        </div>
      </header>

      <div class="stat-grid">
        <div class="stat">
          <span>Actionnables</span>
          <strong>{{ actionable().length }}</strong>
          <small>Peuvent recevoir un parcours</small>
        </div>
        <div class="stat">
          <span>En attente</span>
          <strong>{{ queued().length }}</strong>
          <small>Détectés pendant un cycle actif</small>
        </div>
        <div class="stat">
          <span>En formation</span>
          <strong>{{ inTraining().length }}</strong>
          <small>Un parcours est en cours</small>
        </div>
        <div class="stat">
          <span>Résolus</span>
          <strong>{{ resolved().length }}</strong>
          <small>Preuve d’évaluation acquise</small>
        </div>
      </div>

      @if (queued().length > 0) {
        <p class="note">
          {{ queued().length }} écart(s) ont été détectés pendant votre formation ou votre
          évaluation. Ils restent en attente : ils ne sont ni perdus ni fusionnés, et deviennent
          actionnables dès la fin du cycle en cours.
        </p>
      }

      <section class="panel">
        <div class="toolbar" style="margin-bottom: 14px">
          <div class="filters">
            @for (filter of filters; track filter.value) {
              <button
                type="button"
                class="filter"
                [class.filter--on]="active() === filter.value"
                (click)="active.set(filter.value)"
              >
                {{ filter.label }}
              </button>
            }
          </div>
          <div class="toolbar__spacer"></div>
          <span class="wa-small wa-muted">{{ filtered().length }} écart(s) affiché(s)</span>
        </div>

        <div class="list">
          @for (gap of filtered(); track gap.id) {
            <article class="gap-card">
              <div class="gap-card__head">
                <div>
                  <a class="gap-card__title" [routerLink]="['/app/ecarts', gap.id]">
                    {{ gap.skillLabel }}
                  </a>
                  <div class="chips" style="margin-top: 5px">
                    <span class="wa-chip" [class]="statusClass(gap.status)">{{ lifecycle[gap.status] }}</span>
                    <span class="wa-chip wa-chip--neutral">{{ priorityLabel(gap.priority) }}</span>
                    <span class="wa-chip wa-chip--neutral">confiance {{ Math.round(gap.confidence * 100) }} %</span>
                  </div>
                </div>
                <div class="gap-card__actions">
                  @if (canGenerate(gap)) {
                    <button class="btn btn--primary btn--small" type="button" (click)="generate(gap)">
                      <span class="material-symbols-outlined">auto_awesome</span>
                      Générer un parcours
                    </button>
                  }
                  @if (gap.requestId) {
                    <a class="btn btn--small" [routerLink]="['/app/formations', gap.requestId]">
                      <span class="material-symbols-outlined">school</span>
                      Ouvrir le parcours
                    </a>
                  }
                  <a class="btn btn--ghost btn--small" [routerLink]="['/app/ecarts', gap.id]">
                    Détail
                  </a>
                </div>
              </div>

              <div class="gap-card__levels">
                <span>{{ gap.currentLevel }}</span>
                <div class="bar bar--warning">
                  <span [style.width.%]="gap.currentLevel"></span>
                </div>
                <span>{{ gap.targetLevel }}</span>
                <span class="gap-card__delta">−{{ gap.gap }} pts</span>
              </div>

              <p class="gap-card__inference">{{ gap.inference }}</p>

              @if (gap.queueNote) {
                <p class="note" style="margin: 8px 0 0">{{ gap.queueNote }}</p>
              }

              <div class="gap-card__foot">
                <span>
                  <span class="material-symbols-outlined">fact_check</span>
                  {{ gap.observedFacts.length }} fait(s) observé(s)
                </span>
                <span>Détecté le {{ day(gap.detectedAt) }}</span>
                <span class="wa-small wa-muted">
                  Formats conseillés :
                  @for (format of gap.recommendedFormats; track format) {
                    {{ formatLabels[format] }}{{ $last ? '' : ', ' }}
                  }
                </span>
              </div>
            </article>
          }
          @if (filtered().length === 0) {
            <p class="empty">Aucun écart dans ce filtre.</p>
          }
        </div>
      </section>
    </div>
  `,
  styles: [
    `
      .gap-card {
        padding: 14px 16px;
        border-radius: 13px;
        border: 1px solid var(--wa-border);
        background: #fff;
      }
      .gap-card__head {
        display: flex;
        justify-content: space-between;
        gap: 14px;
        align-items: flex-start;
        flex-wrap: wrap;
      }
      .gap-card__title {
        font-size: 14.5px;
        font-weight: 700;
        color: var(--wa-ink);
        text-decoration: none;
      }
      .gap-card__title:hover {
        color: var(--wa-primary-deep);
      }
      .gap-card__actions {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
      }
      .gap-card__levels {
        display: flex;
        align-items: center;
        gap: 9px;
        margin: 11px 0 9px;
        font-size: 11px;
        font-weight: 700;
        color: var(--wa-ink-soft);
      }
      .gap-card__levels .bar {
        flex: 1;
      }
      .gap-card__delta {
        color: #a21c12;
      }
      .gap-card__inference {
        margin: 0;
        padding: 10px 12px;
        border-radius: 10px;
        background: var(--wa-surface-2);
        font-size: 12px;
        line-height: 1.55;
        color: var(--wa-ink-soft);
      }
      .gap-card__foot {
        display: flex;
        flex-wrap: wrap;
        gap: 14px;
        margin-top: 9px;
        font-size: 10.5px;
        color: var(--wa-ink-faint);
      }
      .gap-card__foot span {
        display: inline-flex;
        align-items: center;
        gap: 5px;
      }
      .gap-card__foot .material-symbols-outlined {
        font-size: 15px;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GapsPage {
  private readonly data = inject(DataService);
  private readonly router = inject(Router);

  readonly actionable = this.data.actionableGaps;
  readonly queued = this.data.queuedGaps;
  readonly inTraining = this.data.gapsInTraining;
  readonly resolved = this.data.resolvedGaps;
  readonly lifecycle = GAP_LIFECYCLE_LABELS;
  readonly formatLabels = FORMAT_LABELS;
  readonly Math = Math;

  readonly filters: { value: 'ALL' | GapLifecycle; label: string }[] = [
    { value: 'ALL', label: 'Tous' },
    { value: 'NOUVEAU', label: 'Nouveaux' },
    { value: 'EN_ATTENTE', label: 'En attente' },
    { value: 'EN_FORMATION', label: 'En formation' },
    { value: 'PARTIELLEMENT_RESOLU', label: 'Partiels' },
    { value: 'RESOLU', label: 'Résolus' },
    { value: 'TOUJOURS_OUVERT', label: 'Toujours ouverts' },
  ];

  readonly active = signal<'ALL' | GapLifecycle>('ALL');

  readonly filtered = computed(() => {
    const filter = this.active();
    const gaps = this.data.gaps();
    return filter === 'ALL' ? gaps : gaps.filter((gap) => gap.status === filter);
  });

  canGenerate(gap: SkillGap): boolean {
    return gap.status !== 'EN_ATTENTE' && gap.status !== 'EN_FORMATION' && gap.status !== 'RESOLU';
  }

  generate(gap: SkillGap): void {
    const request = this.data.generateTrainingForGap(gap.id);
    if (request) {
      void this.router.navigate(['/app/formations', request.id]);
    }
  }

  priorityLabel(priority: string): string {
    return priority === 'HIGH' ? 'Priorité haute' : priority === 'MEDIUM' ? 'Priorité moyenne' : 'Priorité basse';
  }

  statusClass(status: GapLifecycle): string {
    switch (status) {
      case 'RESOLU':
        return 'wa-chip wa-chip--success';
      case 'EN_ATTENTE':
        return 'wa-chip wa-chip--warning';
      case 'EN_FORMATION':
      case 'PARTIELLEMENT_RESOLU':
        return 'wa-chip wa-chip--info';
      case 'TOUJOURS_OUVERT':
        return 'wa-chip wa-chip--danger';
      default:
        return 'wa-chip wa-chip--neutral';
    }
  }

  day(value: string): string {
    return new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  }
}
