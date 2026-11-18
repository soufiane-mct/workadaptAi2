import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FORMAT_LABELS, TrainingFormatInfo, TrainingNeed } from '../../core/models';
import { DataService } from '../../core/data/data.service';

@Component({
  selector: 'wa-hr-needs-page',
  imports: [RouterLink],
  styleUrl: '../pages.scss',
  template: `
    <div class="page">
      <header class="page-head">
        <div>
          <h1>Besoins de formation agrégés</h1>
          <p>
            Un besoin n’est jamais la somme automatique des écarts individuels : il est calculé
            par compétence et par département, avec un nombre de personnes concernées et un
            écart moyen. Aucun nom n’est exposé.
          </p>
        </div>
        <div class="page-head__actions">
          <span class="wa-chip wa-chip--success">Agrégé · non nominatif</span>
          <a class="btn" routerLink="/app/rh/rapports">
            <span class="material-symbols-outlined">download</span>
            Exporter les besoins
          </a>
        </div>
      </header>

      @if (message()) {
        <p class="note note--ok">{{ message() }}</p>
      }

      <div class="stat-grid">
        <div class="stat">
          <span>Besoins ouverts</span>
          <strong>{{ needs.length }}</strong>
          <small>Compétences distinctes</small>
        </div>
        <div class="stat">
          <span>Priorité haute</span>
          <strong>{{ high().length }}</strong>
          <small>Écart moyen supérieur à 30 pts</small>
        </div>
        <div class="stat">
          <span>Personnes concernées</span>
          <strong>{{ concerned() }}</strong>
          <small>Somme des besoins, non dédupliquée</small>
        </div>
        <div class="stat">
          <span>Départements</span>
          <strong>{{ departments().length }}</strong>
          <small>Périmètre du plan</small>
        </div>
      </div>

      <div class="split">
        <section class="panel">
          <div class="toolbar" style="margin-bottom: 12px">
            <div class="filters">
              @for (filter of departmentFilters(); track filter) {
                <button
                  type="button"
                  class="filter"
                  [class.filter--on]="department() === filter"
                  (click)="department.set(filter)"
                >
                  {{ filter === 'ALL' ? 'Tous' : filter }}
                </button>
              }
            </div>
            <div class="toolbar__spacer"></div>
            <div class="filters">
              @for (filter of priorityFilters; track filter.value) {
                <button
                  type="button"
                  class="filter"
                  [class.filter--on]="priority() === filter.value"
                  (click)="priority.set(filter.value)"
                >
                  {{ filter.label }}
                </button>
              }
            </div>
          </div>

          <div class="need-list">
            @for (need of filtered(); track need.id) {
              <article
                class="need"
                [class.need--selected]="selected()?.id === need.id"
                [attr.data-priority]="need.priority"
                (click)="selected.set(need)"
              >
                <div class="need__rank material-symbols-outlined">{{ priorityIcon(need.priority) }}</div>
                <div class="need__body">
                  <div class="need__head">
                    <strong>{{ need.skill }}</strong>
                    <span class="wa-chip" [class]="priorityClass(need.priority)">
                      {{ priorityLabel(need.priority) }}
                    </span>
                    <span class="wa-chip wa-chip--neutral">{{ need.department }}</span>
                  </div>
                  <p>
                    {{ need.employeesConcerned }} personnes concernées · écart moyen
                    <strong>{{ need.averageGap }} pts</strong>
                  </p>
                  <div class="need__formats">
                    @for (format of need.recommendedFormats; track format) {
                      <span class="wa-chip wa-chip--info">{{ formatLabels[format] }}</span>
                    }
                  </div>
                </div>
                <div class="need__trend" [class.need__trend--down]="need.trend < 0">
                  <span class="material-symbols-outlined">{{ need.trend >= 0 ? 'trending_up' : 'trending_down' }}</span>
                  <strong>{{ need.trend > 0 ? '+' : '' }}{{ need.trend }}</strong>
                  <small>pts / mois</small>
                </div>
              </article>
            }
            @if (filtered().length === 0) {
              <p class="empty">Aucun besoin dans ce filtre.</p>
            }
          </div>
        </section>

        <div style="display: flex; flex-direction: column; gap: 18px">
          @if (selected(); as need) {
            <section class="panel">
              <h2>{{ need.skill }}</h2>
              <p class="panel__sub">{{ need.department }} · besoin collectif agrégé</p>
              <div class="kv-grid">
                <div class="kv">
                  <span>Personnes concernées</span>
                  <strong>{{ need.employeesConcerned }}</strong>
                </div>
                <div class="kv">
                  <span>Écart moyen</span>
                  <strong>{{ need.averageGap }} pts</strong>
                </div>
                <div class="kv">
                  <span>Priorité</span>
                  <strong>{{ priorityLabel(need.priority) }}</strong>
                </div>
                <div class="kv">
                  <span>Tendance</span>
                  <strong>{{ need.trend > 0 ? '+' : '' }}{{ need.trend }} pts / mois</strong>
                </div>
              </div>

              <h3 class="sub">Formats recommandés</h3>
              <div class="format-cards">
                @for (format of need.recommendedFormats; track format) {
                  <div class="format-card">
                    <div class="format-card__head">
                      <span class="material-symbols-outlined">{{ formatInfo(format).icon }}</span>
                      <strong>{{ formatLabels[format] }}</strong>
                    </div>
                    <p>{{ formatInfo(format).tagline }}</p>
                    <small>{{ formatInfo(format).typicalHours }} · preuve : {{ formatInfo(format).proof }}</small>
                  </div>
                }
              </div>

              <h3 class="sub">Décision</h3>
              <p class="note note--info">
                Les RH ne créent pas de parcours directement. Un besoin devient un plan seulement
                lorsqu’un superviseur valide les parcours individuels correspondants.
              </p>
              <button class="btn btn--primary" type="button" style="width: 100%; margin-top: 10px" (click)="propose(need)">
                <span class="material-symbols-outlined">campaign</span>
                Proposer un plan de formation (simulé)
              </button>
            </section>
          }

          <section class="panel">
            <h2>Méthode de calcul</h2>
            <ol class="method">
              <li>Les écarts individuels sont regroupés par compétence et département.</li>
              <li>Seuls les écarts non résolus et confirmés sont conservés.</li>
              <li>L’écart moyen et l’effectif concerné déterminent la priorité.</li>
              <li>La tendance compare le niveau agrégé à M-1.</li>
              <li>Aucun nom, aucun identifiant employé n’est transmis à cette vue.</li>
            </ol>
          </section>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .need-list {
        display: flex;
        flex-direction: column;
        gap: 7px;
      }
      .need {
        display: flex;
        gap: 11px;
        align-items: flex-start;
        padding: 11px 13px;
        border-radius: 12px;
        border: 1px solid var(--wa-border);
        background: #fff;
        cursor: pointer;
      }
      .need:hover {
        background: #fbfcff;
      }
      .need--selected {
        border-color: var(--wa-primary);
        box-shadow: 0 0 0 3px rgba(47, 84, 235, 0.08);
      }
      .need[data-priority='HIGH'] {
        border-left: 3px solid var(--wa-danger);
      }
      .need[data-priority='MEDIUM'] {
        border-left: 3px solid var(--wa-warning);
      }
      .need[data-priority='LOW'] {
        border-left: 3px solid var(--wa-ink-faint);
      }
      .need__rank {
        width: 30px;
        height: 30px;
        flex: none;
        border-radius: 9px;
        background: var(--wa-surface-2);
        display: grid;
        place-items: center;
        font-size: 17px;
        color: var(--wa-ink-soft);
      }
      .need__body {
        flex: 1;
        min-width: 0;
      }
      .need__head {
        display: flex;
        align-items: center;
        gap: 7px;
        flex-wrap: wrap;
      }
      .need__head strong {
        font-size: 13px;
      }
      .need__body p {
        margin: 4px 0 5px;
        font-size: 11.5px;
        color: var(--wa-ink-soft);
      }
      .need__formats {
        display: flex;
        gap: 5px;
        flex-wrap: wrap;
      }
      .need__trend {
        flex: none;
        text-align: right;
        color: #0a6b3d;
      }
      .need__trend--down {
        color: #a21c12;
      }
      .need__trend .material-symbols-outlined {
        font-size: 18px;
        vertical-align: middle;
      }
      .need__trend strong {
        font-size: 13px;
      }
      .need__trend small {
        display: block;
        font-size: 9.5px;
        color: var(--wa-ink-faint);
      }
      .format-cards {
        display: flex;
        flex-direction: column;
        gap: 7px;
      }
      .format-card {
        padding: 9px 11px;
        border-radius: 10px;
        border: 1px dashed var(--wa-border-strong);
      }
      .format-card__head {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .format-card__head .material-symbols-outlined {
        font-size: 17px;
        color: var(--wa-primary-deep);
      }
      .format-card__head strong {
        font-size: 12px;
      }
      .format-card p {
        margin: 4px 0 2px;
        font-size: 11px;
        line-height: 1.45;
        color: var(--wa-ink-soft);
      }
      .format-card small {
        font-size: 10px;
        color: var(--wa-ink-faint);
      }
      .method {
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
export class HrNeedsPage {
  private readonly data = inject(DataService);

  readonly needs = this.data.needs;
  readonly formatLabels = FORMAT_LABELS;

  readonly department = signal<string>('ALL');
  readonly priority = signal<'ALL' | TrainingNeed['priority']>('ALL');
  readonly selected = signal<TrainingNeed | undefined>(this.needs[0]);
  readonly message = signal('');

  readonly priorityFilters: { value: 'ALL' | TrainingNeed['priority']; label: string }[] = [
    { value: 'ALL', label: 'Toutes' },
    { value: 'HIGH', label: 'Haute' },
    { value: 'MEDIUM', label: 'Moyenne' },
    { value: 'LOW', label: 'Basse' },
  ];

  readonly departments = computed(() => [...new Set(this.needs.map((need) => need.department))]);
  readonly departmentFilters = computed(() => ['ALL', ...this.departments()]);

  readonly high = computed(() => this.needs.filter((need) => need.priority === 'HIGH'));
  readonly concerned = computed(() =>
    this.needs.reduce((sum, need) => sum + need.employeesConcerned, 0),
  );

  readonly filtered = computed(() => {
    const department = this.department();
    const priority = this.priority();
    return this.needs.filter(
      (need) =>
        (department === 'ALL' || need.department === department) &&
        (priority === 'ALL' || need.priority === priority),
    );
  });

  formatInfo(format: TrainingNeed['recommendedFormats'][number]): TrainingFormatInfo {
    return (
      this.data.formatCatalog.find((info) => info.code === format) ?? this.data.formatCatalog[0]
    );
  }

  propose(need: TrainingNeed): void {
    this.message.set(
      `Plan proposé pour « ${need.skill} » (${need.department}, ${need.employeesConcerned} personnes). ` +
        'Il reste indicatif : chaque parcours individuel devra être généré puis validé par un superviseur.',
    );
  }

  priorityLabel(priority: TrainingNeed['priority']): string {
    return priority === 'HIGH' ? 'Haute' : priority === 'MEDIUM' ? 'Moyenne' : 'Basse';
  }

  priorityIcon(priority: TrainingNeed['priority']): string {
    return priority === 'HIGH' ? 'priority_high' : priority === 'MEDIUM' ? 'drag_handle' : 'south';
  }

  priorityClass(priority: TrainingNeed['priority']): string {
    return priority === 'HIGH'
      ? 'wa-chip wa-chip--danger'
      : priority === 'MEDIUM'
        ? 'wa-chip wa-chip--warning'
        : 'wa-chip wa-chip--neutral';
  }
}
