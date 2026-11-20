import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FORMAT_LABELS } from '../../core/models';
import { DataService } from '../../core/data/data.service';
import { KpiCard } from '../../shared/ui/kpi-card';

@Component({
  selector: 'wa-manager-dashboard',
  imports: [RouterLink, KpiCard],
  template: `
    <section class="hero">
      <div>
        <p class="hero__eyebrow">Pilotage de l’équipe</p>
        <h1>Décider sur des faits, pas sur des impressions.</h1>
        <p class="hero__text">
          {{ pending().length }} parcours attendent votre décision. Le curriculum complet est déjà
          généré : vous pouvez approuver, modifier réellement ou rejeter avec un motif horodaté.
        </p>
        <div class="hero__actions">
          <a class="primary" routerLink="/app/validations">
            <span class="material-symbols-outlined">fact_check</span>
            Ouvrir les validations
          </a>
          <a class="ghost" routerLink="/app/suivi-formations">
            <span class="material-symbols-outlined">monitoring</span>
            Suivre les formations
          </a>
        </div>
      </div>
      <div class="hero__badge">
        <span class="material-symbols-outlined">groups</span>
        <div>
          <strong>{{ team().length }} membres suivis</strong>
          <small>Niveau moyen {{ teamAverage() }}/100 · {{ inTraining() }} en formation</small>
        </div>
      </div>
    </section>

    <div class="wa-grid wa-grid--kpi">
      <wa-kpi-card label="À valider" [value]="pending().length" icon="pending_actions" tone="amber" hint="Curriculum visible intégralement" />
      <wa-kpi-card label="Formations en cours" [value]="inProgress().length" icon="school" tone="violet" hint="La collecte continue" />
      <wa-kpi-card label="Résultats d’évaluation" [value]="reports().length" icon="grading" tone="green" [hint]="passRate() + ' % de réussite'" />
      <wa-kpi-card label="Écarts en attente" [value]="queued().length" icon="hourglass_top" tone="amber" hint="Détectés pendant un cycle actif" />
    </div>

    <div class="wa-grid wa-grid--2">
      <section class="wa-card">
        <div class="card-head">
          <div>
            <h2 class="wa-card__title">File de validation</h2>
            <p class="wa-card__subtitle">Aucune décision sans avoir ouvert le parcours.</p>
          </div>
          <a class="link" routerLink="/app/validations">Tout voir</a>
        </div>
        @if (pending().length === 0) {
          <p class="wa-empty">Aucun parcours en attente. La file se remplit dès qu’un écart est traité.</p>
        }
        @for (request of pending().slice(0, 4); track request.id) {
          <a class="row-card" [routerLink]="['/app/validations', request.id]">
            <span class="icon-round material-symbols-outlined">{{ iconFor(request.format) }}</span>
            <div>
              <strong>{{ titleFor(request.id) }}</strong>
              <p>{{ request.employeeName }} · {{ formatLabels[request.format] }} · {{ request.skillLabel }}</p>
            </div>
            <span class="material-symbols-outlined">chevron_right</span>
          </a>
        }
      </section>

      <section class="wa-card">
        <div class="card-head">
          <div>
            <h2 class="wa-card__title">Avancement de l’équipe</h2>
            <p class="wa-card__subtitle">Temps crédité et unités terminées, pas de classement.</p>
          </div>
          <a class="link" routerLink="/app/equipe">Mon équipe</a>
        </div>
        @for (member of team().slice(0, 4); track member.id) {
          <div class="member">
            <span class="member__avatar">{{ initials(member.name) }}</span>
            <div class="member__body">
              <div class="member__head">
                <strong>{{ member.name }}</strong>
                <small>{{ member.averageLevel }}/100</small>
              </div>
              <div class="bar"><span [style.width.%]="member.averageLevel"></span></div>
              <small class="wa-muted">
                {{ member.activeFormation ? member.activeFormation + ' · ' + member.formationProgress + ' %' : 'Aucune formation active' }}
              </small>
            </div>
          </div>
        }
      </section>
    </div>

    <div class="wa-grid wa-grid--2">
      <section class="wa-card">
        <div class="card-head">
          <div>
            <h2 class="wa-card__title">Derniers résultats</h2>
            <p class="wa-card__subtitle">Score, seuil et décision conservés.</p>
          </div>
          <a class="link" routerLink="/app/resultats">Tous les résultats</a>
        </div>
        @if (reports().length === 0) {
          <p class="wa-empty">Aucune évaluation corrigée pour l’instant.</p>
        }
        @for (report of reports().slice(0, 4); track report.id) {
          <div class="result">
            <strong class="result__score">{{ report.score }}</strong>
            <div>
              <strong>{{ titleFor(report.requestId) }}</strong>
              <p class="wa-small wa-muted">
                Seuil {{ report.passScore }} · {{ report.decision === 'REUSSI' ? 'réussi' : 'non réussi' }}
                · {{ report.levelBefore }} → {{ report.levelAfter }}/100
              </p>
            </div>
            <span class="wa-chip" [class]="report.decision === 'REUSSI' ? 'wa-chip wa-chip--success' : 'wa-chip wa-chip--danger'">
              {{ report.decision === 'REUSSI' ? 'Réussi' : 'Échoué' }}
            </span>
          </div>
        }
      </section>

      <section class="wa-card">
        <div class="card-head">
          <div>
            <h2 class="wa-card__title">Signaux à traiter</h2>
            <p class="wa-card__subtitle">Écarts détectés pendant une formation ou une évaluation.</p>
          </div>
          <a class="link" routerLink="/app/suivi-formations">Suivi</a>
        </div>
        @if (queued().length === 0) {
          <p class="wa-empty">Aucun écart mis en attente.</p>
        }
        @for (gap of queued(); track gap.id) {
          <div class="result">
            <span class="icon-round material-symbols-outlined">hourglass_top</span>
            <div>
              <strong>{{ gap.skillLabel }}</strong>
              <p class="wa-small wa-muted">{{ gap.queueNote ?? 'Détecté pendant un cycle actif.' }}</p>
            </div>
            <span class="wa-chip wa-chip--warning">En attente</span>
          </div>
        }
      </section>
    </div>
  `,
  styles: [
    `
      .hero {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 22px;
        padding: 26px 28px;
        border-radius: var(--wa-radius-lg);
        background: linear-gradient(135deg, #101a33 0%, #1d3cbf 100%);
        color: #fff;
        box-shadow: var(--wa-shadow);
        margin-bottom: 18px;
      }
      .hero__eyebrow {
        margin: 0 0 6px;
        font-size: 10.5px;
        text-transform: uppercase;
        letter-spacing: 0.14em;
        color: #9fb6ff;
        font-weight: 700;
      }
      .hero h1 {
        margin: 0 0 8px;
        font-size: 25px;
        letter-spacing: -0.025em;
        max-width: 52ch;
      }
      .hero__text {
        margin: 0 0 16px;
        max-width: 62ch;
        font-size: 13px;
        line-height: 1.6;
        color: rgba(255, 255, 255, 0.82);
      }
      .hero__actions {
        display: flex;
        gap: 9px;
        flex-wrap: wrap;
      }
      .hero__actions a {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 9px 15px;
        border-radius: 10px;
        font-size: 12.5px;
        font-weight: 600;
        text-decoration: none;
      }
      .primary {
        background: #fff;
        color: #1d3cbf;
      }
      .ghost {
        border: 1px solid rgba(255, 255, 255, 0.32);
        color: #fff;
      }
      .hero__badge {
        display: flex;
        gap: 10px;
        align-items: center;
        padding: 14px 16px;
        border-radius: 13px;
        background: rgba(255, 255, 255, 0.1);
        min-width: 240px;
      }
      .hero__badge .material-symbols-outlined {
        font-size: 30px;
        color: #9fb6ff;
      }
      .hero__badge strong {
        display: block;
        font-size: 13px;
      }
      .hero__badge small {
        font-size: 10.5px;
        color: rgba(255, 255, 255, 0.75);
      }
      .card-head {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 12px;
        margin-bottom: 10px;
      }
      .link {
        font-size: 11.5px;
        font-weight: 600;
        color: var(--wa-primary-deep);
        text-decoration: none;
      }
      .row-card {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 9px 10px;
        border-radius: 10px;
        border: 1px solid var(--wa-border);
        text-decoration: none;
        color: inherit;
        margin-bottom: 6px;
      }
      .row-card:hover {
        background: var(--wa-surface-2);
      }
      .row-card strong {
        display: block;
        font-size: 12.5px;
      }
      .row-card p {
        margin: 2px 0 0;
        font-size: 11px;
        color: var(--wa-ink-soft);
      }
      .row-card .material-symbols-outlined:last-child {
        color: var(--wa-ink-faint);
      }
      .member {
        display: flex;
        gap: 10px;
        align-items: center;
        padding: 8px 0;
        border-bottom: 1px dashed var(--wa-border);
      }
      .member:last-child {
        border-bottom: none;
      }
      .member__avatar {
        width: 30px;
        height: 30px;
        flex: none;
        border-radius: 9px;
        background: var(--wa-primary-soft);
        color: var(--wa-primary-deep);
        display: grid;
        place-items: center;
        font-size: 10px;
        font-weight: 700;
      }
      .member__body {
        flex: 1;
      }
      .member__head {
        display: flex;
        justify-content: space-between;
      }
      .member__head strong {
        font-size: 12px;
      }
      .member__head small {
        font-size: 10.5px;
        font-weight: 700;
        color: var(--wa-ink-soft);
      }
      .member .bar {
        margin: 4px 0 3px;
      }
      .result {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 9px 0;
        border-bottom: 1px dashed var(--wa-border);
      }
      .result:last-child {
        border-bottom: none;
      }
      .result__score {
        width: 40px;
        flex: none;
        text-align: center;
        font-size: 16px;
      }
      .result div {
        flex: 1;
      }
      .result strong {
        font-size: 12.5px;
      }
      .result p {
        margin: 2px 0 0;
      }
      @media (max-width: 900px) {
        .hero {
          flex-direction: column;
          align-items: flex-start;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ManagerDashboard {
  private readonly data = inject(DataService);

  readonly pending = this.data.pendingRequests;
  readonly inProgress = this.data.supervisorInProgress;
  readonly reports = computed(() =>
    [...this.data.supervisorReports()].sort((a, b) => b.at.localeCompare(a.at)),
  );
  readonly queued = this.data.queuedGaps;
  readonly team = computed(() => this.data.team);
  readonly formatLabels = FORMAT_LABELS;

  readonly teamAverage = computed(() => {
    const team = this.team();
    return team.length === 0
      ? 0
      : Math.round(team.reduce((sum, member) => sum + member.averageLevel, 0) / team.length);
  });

  readonly inTraining = computed(() => this.team().filter((member) => !!member.activeFormation).length);

  readonly passRate = computed(() => {
    const reports = this.reports();
    if (reports.length === 0) {
      return 0;
    }
    return Math.round(
      (reports.filter((report) => report.decision === 'REUSSI').length / reports.length) * 100,
    );
  });

  titleFor(requestId: string): string {
    return this.data.programFor(requestId)?.title ?? requestId;
  }

  initials(name: string): string {
    return name
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('');
  }

  iconFor(format: string): string {
    const icons: Record<string, string> = {
      MULTIMEDIA: 'play_circle',
      INTERACTIVE: 'style',
      PRACTICAL: 'terminal',
      PROJECT: 'account_tree',
      SIMULATION: 'siren',
      AI_TUTORED: 'psychology',
      COLLABORATIVE: 'groups',
    };
    return icons[format] ?? 'school';
  }
}
