import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DataService } from '../../core/data/data.service';
import { SkillBar } from '../../shared/ui/skill-bar';
import { KpiCard } from '../../shared/ui/kpi-card';
import { StatusChip } from '../../shared/ui/status-chip';
import { FORMAT_LABELS } from '../../core/models';

@Component({
  selector: 'wa-employee-dashboard',
  imports: [RouterLink, SkillBar, KpiCard, StatusChip],
  template: `
    <section class="hero">
      <div class="hero__copy">
        <p class="hero__eyebrow">Bonjour {{ firstName() }}</p>
        <h1>Votre progression continue, même hors formation.</h1>
        <p class="hero__text">
          La collecte tourne en permanence. {{ actionable().length }} écart(s) sont actionnables,
          {{ queued().length }} attendent la fin du cycle en cours. Dernier événement collecté :
          {{ lastEventLabel() }}.
        </p>
        <div class="hero__actions">
          <a class="primary" routerLink="/app/ecarts">
            <span class="material-symbols-outlined">track_changes</span>
            Voir mes écarts
          </a>
          <a class="ghost" routerLink="/app/collecte">
            <span class="material-symbols-outlined">sensors</span>
            État de la collecte
          </a>
        </div>
      </div>
      <div class="hero__badge">
        <span class="material-symbols-outlined">verified_user</span>
        <div>
          <strong>{{ certificates().length }} certificat(s)</strong>
          <small>Chaque certificat est adossé à une évaluation réussie.</small>
        </div>
      </div>
    </section>

    <div class="wa-grid wa-grid--kpi">
      <wa-kpi-card label="Niveau moyen" [value]="averageLevel()" unit="/100" icon="speed" hint="Moyenne des compétences suivies" />
      <wa-kpi-card label="Écarts actionnables" [value]="actionable().length" icon="track_changes" tone="amber" [hint]="queued().length + ' en attente'" />
      <wa-kpi-card label="Formations en cours" [value]="inProgress().length" icon="school" tone="violet" hint="La collecte continue pendant la formation" />
      <wa-kpi-card label="Points d’écart" [value]="totalGapPoints()" icon="insights" tone="green" hint="Somme des écarts restants" />
    </div>

    <div class="wa-grid wa-grid--2">
      <section class="wa-card">
        <h2 class="wa-card__title">Compétences suivies</h2>
        <p class="wa-card__subtitle">Niveau estimé vs cible du poste. La source est toujours indiquée.</p>
        <div class="skills">
          @for (skill of skills(); track skill.code) {
            <div class="skill">
              <div class="skill__head">
                <div>
                  <strong>{{ skill.label }}</strong>
                  <span class="wa-chip wa-chip--neutral">{{ sourceLabel(skill.source) }}</span>
                </div>
                <span class="wa-small wa-muted">confiance {{ percent(skill.confidence) }}</span>
              </div>
              <wa-skill-bar [level]="skill.level" [target]="skill.target" />
            </div>
          }
        </div>
      </section>

      <section class="wa-card">
        <h2 class="wa-card__title">Écarts prioritaires</h2>
        <p class="wa-card__subtitle">Un écart n’est jamais une sanction : c’est une action possible.</p>
        @if (actionable().length === 0) {
          <p class="wa-empty">Aucun écart actionnable. La collecte continue de surveiller vos compétences.</p>
        }
        @for (gap of actionable().slice(0, 4); track gap.id) {
          <a class="gap" [routerLink]="['/app/ecarts', gap.id]">
            <div class="gap__head">
              <strong>{{ gap.skillLabel }}</strong>
              <wa-chip [label]="priorityLabel(gap.priority)" [tone]="gap.priority === 'HIGH' ? 'danger' : gap.priority === 'MEDIUM' ? 'warning' : 'neutral'" />
            </div>
            <p class="wa-small wa-muted">
              {{ gap.currentLevel }} → {{ gap.targetLevel }} · écart de {{ gap.gap }} points
            </p>
            <div class="gap__bar">
              <span [style.width.%]="gap.currentLevel"></span>
            </div>
          </a>
        }
      </section>
    </div>

    @if (active(); as training) {
      <section class="wa-card active">
        <div class="active__head">
          <div>
            <span class="wa-chip wa-chip--info">Formation en cours</span>
            <h2>{{ programTitle() }}</h2>
            <p class="wa-muted wa-small">
              {{ formatLabel() }} · {{ training.progressPercent }} % · la collecte continue et les
              nouveaux écarts sont mis en attente.
            </p>
          </div>
          <a class="primary" [routerLink]="['/app/formations', training.id]">
            Reprendre
            <span class="material-symbols-outlined">arrow_forward</span>
          </a>
        </div>
        <div class="active__track">
          <span [style.width.%]="training.progressPercent"></span>
        </div>
      </section>
    }

    @if (evaluable(); as evaluation) {
      <section class="wa-card evaluable">
        <div class="active__head">
          <div>
            <span class="wa-chip wa-chip--warning">Évaluation disponible</span>
            <h2>{{ evaluationProgramTitle() }}</h2>
            <p class="wa-muted wa-small">
              Votre formation est terminée. Il reste la preuve de maîtrise : choisissez une
              méthode parmi les cinq disponibles. En cas d’échec, une remédiation est créée
              automatiquement.
            </p>
          </div>
          <a class="primary" [routerLink]="['/app/evaluations', evaluation.id]">
            Passer l’évaluation
            <span class="material-symbols-outlined">arrow_forward</span>
          </a>
        </div>
      </section>
    }

    <section class="wa-card">
      <h2 class="wa-card__title">Dernières notifications</h2>
      @for (notification of notifications().slice(0, 3); track notification.id) {
        <div class="notif">
          <span class="material-symbols-outlined">notifications_active</span>
          <div>
            <strong>{{ notification.title }}</strong>
            <p class="wa-small wa-muted">{{ notification.message }}</p>
          </div>
        </div>
      }
      @if (notifications().length === 0) {
        <p class="wa-empty">Aucune notification.</p>
      }
    </section>
  `,
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
        gap: 18px;
      }
      .hero {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 280px;
        gap: 22px;
        padding: 26px;
        border-radius: var(--wa-radius-lg);
        background: var(--wa-grad-brand);
        color: #fff;
        box-shadow: var(--wa-shadow-lg);
      }
      .hero__eyebrow {
        margin: 0 0 6px;
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        opacity: 0.75;
      }
      .hero h1 {
        margin: 0 0 10px;
        font-size: 27px;
        line-height: 1.15;
        letter-spacing: -0.02em;
        max-width: 24ch;
      }
      .hero__text {
        margin: 0 0 16px;
        font-size: 13.5px;
        line-height: 1.6;
        max-width: 62ch;
        color: rgba(255, 255, 255, 0.84);
      }
      .hero__actions {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
      }
      .primary {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        padding: 10px 15px;
        border-radius: 10px;
        background: #fff;
        color: var(--wa-primary-deep);
        font-size: 13px;
        font-weight: 600;
        text-decoration: none;
      }
      .ghost {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        padding: 10px 15px;
        border-radius: 10px;
        border: 1px solid rgba(255, 255, 255, 0.4);
        color: #fff;
        font-size: 13px;
        text-decoration: none;
      }
      .hero__badge {
        align-self: center;
        display: flex;
        gap: 12px;
        padding: 16px;
        border-radius: 16px;
        background: rgba(255, 255, 255, 0.13);
        backdrop-filter: blur(6px);
      }
      .hero__badge strong {
        display: block;
        font-size: 15px;
      }
      .hero__badge small {
        font-size: 11.5px;
        color: rgba(255, 255, 255, 0.78);
        line-height: 1.45;
      }
      .skills {
        display: flex;
        flex-direction: column;
        gap: 13px;
      }
      .skill__head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 5px;
        gap: 8px;
      }
      .skill__head div {
        display: flex;
        align-items: center;
        gap: 7px;
      }
      .skill__head strong {
        font-size: 13px;
      }
      .gap {
        display: block;
        padding: 11px 12px;
        border-radius: 12px;
        border: 1px solid var(--wa-border);
        text-decoration: none;
        color: inherit;
        margin-bottom: 8px;
      }
      .gap:hover {
        border-color: var(--wa-border-strong);
        background: var(--wa-surface-2);
      }
      .gap__head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 3px;
      }
      .gap__bar {
        height: 6px;
        border-radius: 999px;
        background: var(--wa-surface-3);
        overflow: hidden;
      }
      .gap__bar span {
        display: block;
        height: 100%;
        background: var(--wa-warning);
      }
      .active__head {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 16px;
      }
      .active__head h2 {
        margin: 8px 0 4px;
        font-size: 19px;
      }
      .evaluable {
        border-left: 4px solid var(--wa-warning);
      }
      .active__track {
        margin-top: 14px;
        height: 9px;
        border-radius: 999px;
        background: var(--wa-surface-3);
        overflow: hidden;
      }
      .active__track span {
        display: block;
        height: 100%;
        background: var(--wa-grad-brand);
      }
      .notif {
        display: flex;
        gap: 10px;
        padding: 9px 0;
        border-bottom: 1px solid var(--wa-border);
      }
      .notif:last-child {
        border-bottom: none;
      }
      .notif .material-symbols-outlined {
        color: var(--wa-primary);
      }
      .notif p {
        margin: 2px 0 0;
      }
      @media (max-width: 900px) {
        .hero {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmployeeDashboard {
  private readonly data = inject(DataService);

  readonly profile = this.data.profile;
  readonly skills = this.data.skills;
  readonly actionable = this.data.actionableGaps;
  readonly queued = this.data.queuedGaps;
  readonly certificates = this.data.certificates;
  readonly averageLevel = this.data.averageLevel;
  readonly totalGapPoints = this.data.totalGapPoints;
  readonly inProgress = this.data.trainingInProgress;
  readonly notifications = computed(() => this.data.notificationsForCurrentRole());
  readonly formats = FORMAT_LABELS;

  readonly firstName = computed(() => this.data.profile().firstName);
  readonly active = computed(() => this.inProgress()[0]);
  /**
   * Parcours terminé dont l’évaluation n’est pas encore passée : c’est
   * l’unique porte d’entrée de l’évaluation après la formation.
   */
  readonly evaluable = computed(() =>
    this.data.trainingService
      .completed()
      .find((request) => !this.data.evaluationFor(request.id)),
  );
  readonly evaluationProgramTitle = computed(() => {
    const request = this.evaluable();
    if (!request) {
      return '';
    }
    return this.data.programFor(request.id)?.title ?? request.subject;
  });
  readonly programTitle = computed(
    () => (this.active() ? this.data.programFor(this.active()!.id)?.title ?? '' : ''),
  );
  readonly formatLabel = computed(() => {
    const training = this.active();
    return training ? FORMAT_LABELS[training.format] : '';
  });
  readonly lastEventLabel = computed(
    () => this.data.collectionEvents()[0]?.label ?? 'aucun événement',
  );

  sourceLabel(source: string): string {
    return this.data.skillSourceLabels[source as keyof typeof this.data.skillSourceLabels] ?? source;
  }

  percent(value: number): string {
    return `${Math.round(value * 100)} %`;
  }

  priorityLabel(priority: string): string {
    return priority === 'HIGH' ? 'Priorité haute' : priority === 'MEDIUM' ? 'Priorité moyenne' : 'Priorité basse';
  }
}
