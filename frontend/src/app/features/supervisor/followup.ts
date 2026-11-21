import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FORMAT_LABELS, TrainingFollowUp, TrainingFollowUpStatus } from '../../core/models';
import { DataService } from '../../core/data/data.service';

const STATUS_LABELS: Record<TrainingFollowUpStatus, string> = {
  PENDING_APPROVAL: 'En attente de validation',
  NOT_STARTED: 'Non démarrée',
  IN_PROGRESS: 'En cours',
  COMPLETED: 'Terminée',
  FAILED: 'Évaluation échouée',
};

@Component({
  selector: 'wa-followup-page',
  imports: [RouterLink],
  styleUrl: '../pages.scss',
  template: `
    <div class="page">
      <header class="page-head">
        <div>
          <h1>Suivi des formations</h1>
          <p>
            Suivi opérationnel, pas un tableau de sanction. On regarde le temps de curriculum
            validé, les unités terminées et le résultat d’évaluation — jamais le nombre de clics.
          </p>
        </div>
        <div class="page-head__actions">
          <a class="btn" routerLink="/app/validations">
            <span class="material-symbols-outlined">fact_check</span>
            File de validation
          </a>
        </div>
      </header>

      <div class="stat-grid">
        <div class="stat">
          <span>En cours</span>
          <strong>{{ count('IN_PROGRESS') }}</strong>
          <small>Collecte active pendant la formation</small>
        </div>
        <div class="stat">
          <span>Terminées</span>
          <strong>{{ count('COMPLETED') }}</strong>
          <small>Preuve de fin déposée</small>
        </div>
        <div class="stat">
          <span>Échecs</span>
          <strong>{{ count('FAILED') }}</strong>
          <small>Remédiation créée automatiquement</small>
        </div>
        <div class="stat">
          <span>Heures de formation</span>
          <strong>{{ totalHours() }} h</strong>
          <small>Temps de curriculum validé par unité terminée</small>
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

        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Employé</th>
                <th>Formation</th>
                <th>Format</th>
                <th>Avancement</th>
                <th>Unités</th>
                <th>Temps validé</th>
                <th>Dernière évaluation</th>
                <th>Statut</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              @for (row of filtered(); track row.id) {
                <tr>
                  <td>
                    <strong>{{ row.employee }}</strong>
                  </td>
                  <td>{{ row.formationTitle }}</td>
                  <td><span class="wa-chip wa-chip--neutral">{{ formatLabels[row.format] }}</span></td>
                  <td>
                    <div class="bar" style="min-width: 90px">
                      <span [style.width.%]="row.progress"></span>
                    </div>
                    <small class="wa-muted">{{ row.progress }} %</small>
                  </td>
                  <td>{{ row.unitsDone }} / {{ row.unitsTotal }}</td>
                  <td>{{ hours(row.minutesSpent) }} h</td>
                  <td>
                    @if (row.lastEvaluation !== undefined) {
                      <strong>{{ row.lastEvaluation }}/100</strong>
                    } @else {
                      <span class="wa-muted">—</span>
                    }
                  </td>
                  <td>
                    <span class="wa-chip" [class]="statusClass(row.status)">{{ statusLabels[row.status] }}</span>
                  </td>
                  <td>
                    <a class="btn btn--small" [routerLink]="['/app/validations', row.id]">Ouvrir</a>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        @if (filtered().length === 0) {
          <p class="empty">Aucun parcours dans ce filtre.</p>
        }
      </section>

      <section class="panel">
        <h2>Lecture des chiffres</h2>
        <div class="split--even">
          <div>
            <h3 class="sub">Ce qui compte</h3>
            <ul class="bullets">
              <li>Le nombre d’unités réellement terminées, pas le temps passé à l’écran.</li>
              <li>
                Le temps de curriculum validé par l’agent, qui doit atteindre la durée minimale
                de la formation.
              </li>
              <li>La preuve de fin, propre au format.</li>
              <li>Le résultat d’évaluation, seule preuve de maîtrise.</li>
            </ul>
          </div>
          <div>
            <h3 class="sub">Ce qui ne doit pas être utilisé</h3>
            <ul class="bullets">
              <li>Le classement des employés entre eux.</li>
              <li>Le nombre de connexions ou de clics.</li>
              <li>La vitesse de complétion comme critère de qualité.</li>
              <li>Une moyenne de formation présentée comme une compétence.</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  `,
  styles: [
    `
      .bullets {
        margin: 0;
        padding-left: 18px;
        font-size: 12.5px;
        line-height: 1.7;
        color: var(--wa-ink-soft);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FollowupPage {
  private readonly data = inject(DataService);

  readonly rows = this.data.followUps;
  readonly formatLabels = FORMAT_LABELS;
  readonly statusLabels = STATUS_LABELS;

  readonly filters: { value: 'ALL' | TrainingFollowUpStatus; label: string }[] = [
    { value: 'ALL', label: 'Tous' },
    { value: 'PENDING_APPROVAL', label: 'À valider' },
    { value: 'IN_PROGRESS', label: 'En cours' },
    { value: 'COMPLETED', label: 'Terminées' },
    { value: 'FAILED', label: 'Échecs' },
    { value: 'NOT_STARTED', label: 'Non démarrées' },
  ];

  readonly active = signal<'ALL' | TrainingFollowUpStatus>('ALL');

  readonly filtered = computed(() => {
    const filter = this.active();
    return filter === 'ALL' ? this.rows() : this.rows().filter((row) => row.status === filter);
  });

  readonly totalHours = computed(() =>
    Math.round(this.rows().reduce((sum, row) => sum + row.minutesSpent, 0) / 60),
  );

  count(status: TrainingFollowUpStatus): number {
    return this.rows().filter((row) => row.status === status).length;
  }

  hours(minutes: number): number {
    return Math.round(minutes / 60);
  }

  statusClass(status: TrainingFollowUpStatus): string {
    switch (status) {
      case 'COMPLETED':
        return 'wa-chip wa-chip--success';
      case 'IN_PROGRESS':
        return 'wa-chip wa-chip--info';
      case 'PENDING_APPROVAL':
        return 'wa-chip wa-chip--warning';
      case 'FAILED':
        return 'wa-chip wa-chip--danger';
      default:
        return 'wa-chip wa-chip--neutral';
    }
  }

  track(row: TrainingFollowUp): string {
    return row.id;
  }
}
