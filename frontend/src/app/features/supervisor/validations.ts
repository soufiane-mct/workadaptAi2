import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  FORMAT_LABELS,
  GAP_LIFECYCLE_LABELS,
  TRAINING_REQUEST_STATUS_LABELS,
  TrainingRequest,
} from '../../core/models';
import { DataService } from '../../core/data/data.service';
import { programUnits } from '../../core/data/training/helpers';

@Component({
  selector: 'wa-validations-page',
  imports: [RouterLink],
  styleUrl: '../pages.scss',
  template: `
    <div class="page">
      <header class="page-head">
        <div>
          <h1>Validations de parcours</h1>
          <p>
            Le curriculum complet est généré avant votre décision. Vous voyez tout : unités,
            plan d’étude, critères de fin, preuve attendue et évaluations recommandées. Une
            décision sans lecture du parcours n’a pas de sens.
          </p>
        </div>
        <div class="page-head__actions">
          <span class="wa-chip wa-chip--warning">{{ pending().length }} en attente</span>
        </div>
      </header>

      <div class="stat-grid">
        <div class="stat">
          <span>En attente</span>
          <strong>{{ pending().length }}</strong>
          <small>Décision humaine requise</small>
        </div>
        <div class="stat">
          <span>Approuvés</span>
          <strong>{{ count('APPROVED') + count('IN_PROGRESS') + count('COMPLETED') }}</strong>
          <small>Parcours acceptés</small>
        </div>
        <div class="stat">
          <span>Modifiés</span>
          <strong>{{ count('CHANGES_REQUESTED') }}</strong>
          <small>Curriculum réellement ajusté</small>
        </div>
        <div class="stat">
          <span>Rejetés</span>
          <strong>{{ count('REJECTED') }}</strong>
          <small>Avec motif horodaté</small>
        </div>
      </div>

      <section class="panel">
        <h2>File de validation</h2>
        <p class="panel__sub">
          Chaque demande porte son motif, son écart d’origine et l’intégralité du parcours
          généré. Rien n’est masqué avant décision.
        </p>

        <div class="list">
          @for (request of sorted(); track request.id) {
            <article class="req" [class.req--pending]="request.status === 'PENDING'">
              <div class="req__head">
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
                    {{ request.employeeName }} · {{ request.skillLabel }} · niveau
                    {{ request.levelFrom }} → {{ request.levelTo }}/100
                  </p>
                </div>
                <div class="req__meta">
                  <strong>{{ hoursFor(request) }} h</strong>
                  <small>{{ unitsFor(request).length }} unités · {{ daysFor(request) }} jours</small>
                  <a class="btn btn--primary btn--small" [routerLink]="['/app/validations', request.id]">
                    <span class="material-symbols-outlined">visibility</span>
                    {{ request.status === 'PENDING' ? 'Examiner et décider' : 'Revoir le parcours' }}
                  </a>
                </div>
              </div>

              <p class="req__objective">{{ request.objective }}</p>

              <div class="req__facts">
                <span><span class="material-symbols-outlined">fact_check</span> {{ unitsFor(request).length }} unités</span>
                <span><span class="material-symbols-outlined">schedule</span> {{ hoursFor(request) }} h estimées</span>
                <span><span class="material-symbols-outlined">event</span> Demandé le {{ day(request.requestedAt) }}</span>
                @if (request.supervisorNote) {
                  <span class="wa-small wa-muted">Décision : {{ request.supervisorNote }}</span>
                }
              </div>
            </article>
          }
          @if (sorted().length === 0) {
            <p class="empty">Aucun parcours soumis. La file se remplit dès qu’un écart est traité.</p>
          }
        </div>
      </section>

      <section class="panel">
        <h2>Ce que la validation engage</h2>
        <div class="split--even" style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px">
          <div class="kv">
            <span>Approuver</span>
            <strong>Vous validez le volume, les unités et les conditions de fin.</strong>
            <p class="wa-small wa-muted" style="margin: 4px 0 0">
              L’employé peut démarrer. La collecte continue pendant la formation.
            </p>
          </div>
          <div class="kv">
            <span>Modifier</span>
            <strong>Vous retirez des unités et ajustez la durée réelle.</strong>
            <p class="wa-small wa-muted" style="margin: 4px 0 0">
              Le curriculum, le plan d’étude et les critères de fin sont recalculés.
            </p>
          </div>
          <div class="kv">
            <span>Rejeter</span>
            <strong>Un motif écrit et horodaté est obligatoire.</strong>
            <p class="wa-small wa-muted" style="margin: 4px 0 0">
              L’écart est rouvert et une nouvelle génération reste possible.
            </p>
          </div>
          <div class="kv">
            <span>Ne jamais</span>
            <strong>Valider sans avoir ouvert le parcours.</strong>
            <p class="wa-small wa-muted" style="margin: 4px 0 0">
              La décision est journalisée avec son auteur et son horodatage.
            </p>
          </div>
        </div>
      </section>
    </div>
  `,
  styles: [
    `
      .req {
        padding: 14px 16px;
        border-radius: 13px;
        border: 1px solid var(--wa-border);
        background: #fff;
      }
      .req--pending {
        border-left: 4px solid var(--wa-warning);
        background: #fffdf9;
      }
      .req__head {
        display: flex;
        justify-content: space-between;
        gap: 14px;
        align-items: flex-start;
        flex-wrap: wrap;
      }
      .req h3 {
        margin: 8px 0 3px;
        font-size: 15px;
      }
      .req__meta {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 4px;
        text-align: right;
      }
      .req__meta strong {
        font-size: 18px;
      }
      .req__meta small {
        font-size: 10.5px;
        color: var(--wa-ink-soft);
      }
      .req__objective {
        margin: 10px 0;
        padding: 9px 12px;
        border-radius: 10px;
        background: var(--wa-surface-2);
        font-size: 12px;
        line-height: 1.55;
        color: var(--wa-ink-soft);
      }
      .req__facts {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 14px;
        font-size: 10.5px;
        color: var(--wa-ink-faint);
      }
      .req__facts span {
        display: inline-flex;
        align-items: center;
        gap: 5px;
      }
      .req__facts .material-symbols-outlined {
        font-size: 15px;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ValidationsPage {
  private readonly data = inject(DataService);

  readonly requests = this.data.requests;
  readonly pending = this.data.pendingRequests;
  readonly statusLabels = TRAINING_REQUEST_STATUS_LABELS;
  readonly formatLabels = FORMAT_LABELS;
  readonly gapLabels = GAP_LIFECYCLE_LABELS;

  readonly sorted = computed(() =>
    [...this.requests()].sort((a, b) => {
      if (a.status === 'PENDING' && b.status !== 'PENDING') {
        return -1;
      }
      if (b.status === 'PENDING' && a.status !== 'PENDING') {
        return 1;
      }
      return b.requestedAt.localeCompare(a.requestedAt);
    }),
  );

  count(status: TrainingRequest['status']): number {
    return this.requests().filter((request) => request.status === status).length;
  }

  titleFor(request: TrainingRequest): string {
    return this.data.programFor(request.id)?.title ?? request.subject;
  }

  unitsFor(request: TrainingRequest) {
    const program = this.data.programFor(request.id);
    return program ? programUnits(program) : [];
  }

  hoursFor(request: TrainingRequest): number {
    return this.data.programFor(request.id)?.estimatedHours ?? 0;
  }

  daysFor(request: TrainingRequest): number {
    return this.data.programFor(request.id)?.estimatedDays ?? 0;
  }

  statusClass(status: TrainingRequest['status']): string {
    switch (status) {
      case 'APPROVED':
      case 'COMPLETED':
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
    return new Date(value).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }
}
