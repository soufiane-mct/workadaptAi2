import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  FORMAT_LABELS,
  TRAINING_REQUEST_STATUS_LABELS,
  TrainingRequest,
} from '../../core/models';
import { DataService } from '../../core/data/data.service';

@Component({
  selector: 'wa-trainings-page',
  imports: [RouterLink],
  styleUrl: '../pages.scss',
  template: `
    <div class="page">
      <header class="page-head">
        <div>
          <h1>Mes formations</h1>
          <p>
            Chaque parcours est un curriculum complet : plusieurs unités, plusieurs jours,
            checkpoints formatifs et preuve de fin. Le parcours est généré avant la validation
            du superviseur, qui voit tout.
          </p>
        </div>
        <div class="page-head__actions">
          <a class="btn" routerLink="/app/ecarts">
            <span class="material-symbols-outlined">track_changes</span>
            Voir mes écarts
          </a>
        </div>
      </header>

      <div class="stat-grid">
        <div class="stat">
          <span>En attente de validation</span>
          <strong>{{ pending().length }}</strong>
          <small>Le curriculum est déjà visible</small>
        </div>
        <div class="stat">
          <span>En cours</span>
          <strong>{{ inProgress().length }}</strong>
          <small>Collecte active pendant la formation</small>
        </div>
        <div class="stat">
          <span>Terminées</span>
          <strong>{{ completed().length }}</strong>
          <small>En attente d’évaluation ou certifiées</small>
        </div>
        <div class="stat">
          <span>Certificats</span>
          <strong>{{ certificates().length }}</strong>
          <small>Adossés à une évaluation réussie</small>
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
          <span class="wa-small wa-muted">{{ filtered().length }} parcours</span>
        </div>

        <div class="list">
          @for (request of filtered(); track request.id) {
            <article class="training">
              <div class="training__head">
                <div>
                  <div class="chips">
                    <span class="wa-chip" [class]="statusClass(request.status)">{{ statusLabels[request.status] }}</span>
                    <span class="wa-chip wa-chip--neutral">{{ formatLabels[request.format] }}</span>
                    @if (request.origin === 'REMEDIATION') {
                      <span class="wa-chip wa-chip--warning">Remédiation</span>
                    }
                  </div>
                  <h3>{{ titleFor(request) }}</h3>
                  <p class="wa-small wa-muted">
                    {{ request.skillLabel }} · niveau {{ request.levelFrom }} → {{ request.levelTo }}/100 ·
                    {{ programFor(request)?.estimatedHours ?? 0 }} h ·
                    {{ programFor(request)?.estimatedDays ?? 0 }} jours
                  </p>
                </div>
                <div class="training__actions">
                  @if (request.status === 'COMPLETED') {
                    @if (certificateFor(request.id); as certificate) {
                      <a class="btn btn--primary btn--small" [routerLink]="['/app/certificats', certificate.id]">
                        <span class="material-symbols-outlined">workspace_premium</span>
                        Certificat
                      </a>
                    } @else {
                      <a class="btn btn--primary btn--small" [routerLink]="['/app/evaluations', request.id]">
                        <span class="material-symbols-outlined">grading</span>
                        Passer l’évaluation
                      </a>
                    }
                  }
                  <a class="btn btn--small" [routerLink]="['/app/formations', request.id]">
                    <span class="material-symbols-outlined">open_in_new</span>
                    Ouvrir
                  </a>
                </div>
              </div>

              <div class="training__progress">
                <div class="bar">
                  <span [style.width.%]="request.progressPercent"></span>
                </div>
                <span>{{ request.progressPercent }} %</span>
              </div>

              <div class="training__meta">
                <span><span class="material-symbols-outlined">calendar_today</span> Demandé le {{ day(request.requestedAt) }}</span>
                @if (request.decidedAt) {
                  <span><span class="material-symbols-outlined">verified</span> Décision le {{ day(request.decidedAt) }}</span>
                }
                @if (request.supervisorNote) {
                  <span class="training__note">Décision : {{ request.supervisorNote }}</span>
                }
                @if (request.status === 'PENDING') {
                  <span class="wa-chip wa-chip--warning">Visible par le superviseur, en attente</span>
                }
              </div>
            </article>
          }
          @if (filtered().length === 0) {
            <p class="empty">
              Aucune formation dans ce filtre. Générez un parcours depuis un écart actionnable.
            </p>
          }
        </div>
      </section>
    </div>
  `,
  styles: [
    `
      .training {
        padding: 15px 16px;
        border-radius: 13px;
        border: 1px solid var(--wa-border);
        background: #fff;
      }
      .training__head {
        display: flex;
        justify-content: space-between;
        gap: 14px;
        align-items: flex-start;
        flex-wrap: wrap;
      }
      .training h3 {
        margin: 8px 0 3px;
        font-size: 15px;
        letter-spacing: -0.01em;
      }
      .training__actions {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
      }
      .training__progress {
        display: flex;
        align-items: center;
        gap: 10px;
        margin: 12px 0 9px;
        font-size: 11px;
        font-weight: 700;
        color: var(--wa-ink-soft);
      }
      .training__progress .bar {
        flex: 1;
      }
      .training__meta {
        display: flex;
        flex-wrap: wrap;
        gap: 14px;
        font-size: 10.5px;
        color: var(--wa-ink-faint);
      }
      .training__meta span {
        display: inline-flex;
        align-items: center;
        gap: 5px;
      }
      .training__meta .material-symbols-outlined {
        font-size: 15px;
      }
      .training__note {
        flex-basis: 100%;
        padding: 8px 10px;
        border-radius: 8px;
        background: var(--wa-surface-2);
        color: var(--wa-ink-soft);
        font-size: 11.5px;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrainingsPage {
  private readonly data = inject(DataService);

  readonly requests = this.data.requests;
  readonly pending = this.data.pendingRequests;
  readonly inProgress = this.data.trainingInProgress;
  readonly completed = this.data.completedTrainings;
  readonly certificates = this.data.certificates;
  readonly statusLabels = TRAINING_REQUEST_STATUS_LABELS;
  readonly formatLabels = FORMAT_LABELS;

  readonly filters: { value: string; label: string }[] = [
    { value: 'ALL', label: 'Toutes' },
    { value: 'PENDING', label: 'En validation' },
    { value: 'APPROVED', label: 'Approuvées' },
    { value: 'IN_PROGRESS', label: 'En cours' },
    { value: 'COMPLETED', label: 'Terminées' },
    { value: 'REJECTED', label: 'Rejetées' },
  ];

  readonly active = signal('ALL');

  readonly filtered = computed(() => {
    const filter = this.active();
    return filter === 'ALL'
      ? this.requests()
      : this.requests().filter((request) => request.status === filter);
  });

  titleFor(request: TrainingRequest): string {
    return this.data.programFor(request.id)?.title ?? request.subject;
  }

  programFor(request: TrainingRequest) {
    return this.data.programFor(request.id);
  }

  certificateFor(requestId: string) {
    return this.data.certificateFor(requestId);
  }

  statusClass(status: string): string {
    switch (status) {
      case 'COMPLETED':
      case 'APPROVED':
        return 'wa-chip wa-chip--success';
      case 'PENDING':
      case 'CHANGES_REQUESTED':
        return 'wa-chip wa-chip--warning';
      case 'IN_PROGRESS':
        return 'wa-chip wa-chip--info';
      case 'REJECTED':
      case 'CANCELLED':
        return 'wa-chip wa-chip--danger';
      default:
        return 'wa-chip wa-chip--neutral';
    }
  }

  day(value: string): string {
    return new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  }
}
