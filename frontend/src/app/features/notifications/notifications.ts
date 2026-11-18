import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AppNotification, AppNotificationType } from '../../core/models';
import { DataService } from '../../core/data/data.service';

type NotificationFilter = 'ALL' | 'UNREAD' | 'TRAINING' | 'GAP' | 'EVALUATION';

@Component({
  selector: 'wa-notifications-page',
  imports: [RouterLink],
  styleUrl: '../pages.scss',
  template: `
    <div class="page">
      <header class="page-head">
        <div>
          <h1>Notifications</h1>
          <p>
            Chaque étape de la boucle produit une notification : écart détecté, parcours soumis,
            décision, formation terminée, évaluation, certificat. Elles sont ciblées par rôle,
            jamais envoyées à tout le monde.
          </p>
        </div>
        <div class="page-head__actions">
          @if (unread() > 0) {
            <button class="btn" type="button" (click)="markAll()">
              <span class="material-symbols-outlined">done_all</span>
              Tout marquer comme lu ({{ unread() }})
            </button>
          }
        </div>
      </header>

      <div class="stat-grid">
        <div class="stat">
          <span>Non lues</span>
          <strong>{{ unread() }}</strong>
          <small>Pour votre rôle</small>
        </div>
        <div class="stat">
          <span>Total</span>
          <strong>{{ items().length }}</strong>
          <small>Historique conservé</small>
        </div>
        <div class="stat">
          <span>Formation</span>
          <strong>{{ countOf('TRAINING') }}</strong>
          <small>Soumission, décision, fin</small>
        </div>
        <div class="stat">
          <span>Évaluation</span>
          <strong>{{ countOf('EVALUATION') }}</strong>
          <small>Résultat et certificat</small>
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
          <span class="wa-small wa-muted">{{ filtered().length }} notification(s)</span>
        </div>

        <div class="list">
          @for (notification of filtered(); track notification.id) {
            <article class="notif" [class.notif--unread]="!notification.read">
              <span class="notif__icon material-symbols-outlined" [attr.data-type]="notification.type">
                {{ iconFor(notification.type) }}
              </span>
              <div class="notif__body">
                <div class="notif__head">
                  <strong>{{ notification.title }}</strong>
                  @if (!notification.read) {
                    <span class="notif__dot" aria-label="Non lue"></span>
                  }
                </div>
                <p>{{ notification.message }}</p>
                <div class="notif__foot">
                  <span>{{ when(notification.at) }}</span>
                  <span class="wa-chip wa-chip--neutral">{{ typeLabel(notification.type) }}</span>
                  @if (notification.link) {
                    <a class="notif__link" [routerLink]="notification.link" (click)="read(notification)">
                      Ouvrir
                      <span class="material-symbols-outlined">arrow_forward</span>
                    </a>
                  }
                  @if (!notification.read) {
                    <button class="notif__read" type="button" (click)="read(notification)">Marquer comme lue</button>
                  }
                </div>
              </div>
            </article>
          }
          @if (filtered().length === 0) {
            <p class="empty">Aucune notification dans ce filtre.</p>
          }
        </div>
      </section>
    </div>
  `,
  styles: [
    `
      .notif {
        display: flex;
        gap: 12px;
        padding: 13px 15px;
        border-radius: 12px;
        border: 1px solid var(--wa-border);
        background: #fff;
      }
      .notif--unread {
        background: #fbfcff;
        border-left: 3px solid var(--wa-primary);
      }
      .notif__icon {
        flex: none;
        width: 34px;
        height: 34px;
        border-radius: 10px;
        display: grid;
        place-items: center;
        background: var(--wa-surface-2);
        color: var(--wa-ink-soft);
        font-size: 18px;
      }
      .notif__icon[data-type='GAP_DETECTED'],
      .notif__icon[data-type='GAP_QUEUED'] {
        background: var(--wa-warning-soft);
        color: #8a5800;
      }
      .notif__icon[data-type='TRAINING_SUBMITTED'],
      .notif__icon[data-type='TRAINING_APPROVED'],
      .notif__icon[data-type='TRAINING_STARTED'],
      .notif__icon[data-type='TRAINING_MILESTONE'],
      .notif__icon[data-type='TRAINING_COMPLETED'] {
        background: var(--wa-primary-soft);
        color: var(--wa-primary-deep);
      }
      .notif__icon[data-type='EVALUATION_PASSED'],
      .notif__icon[data-type='CERTIFICATE_ISSUED'] {
        background: var(--wa-success-soft);
        color: #0a6b3d;
      }
      .notif__icon[data-type='EVALUATION_FAILED'],
      .notif__icon[data-type='TRAINING_REJECTED'],
      .notif__icon[data-type='COLLECTION_FAILED'] {
        background: var(--wa-danger-soft);
        color: #a21c12;
      }
      .notif__icon[data-type='REMEDIATION_CREATED'],
      .notif__icon[data-type='CHANGES_REQUESTED'] {
        background: var(--wa-warning-soft);
        color: #8a5800;
      }
      .notif__body {
        flex: 1;
        min-width: 0;
      }
      .notif__head {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .notif__head strong {
        font-size: 13px;
      }
      .notif__dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: var(--wa-primary);
      }
      .notif p {
        margin: 3px 0 0;
        font-size: 12px;
        line-height: 1.55;
        color: var(--wa-ink-soft);
      }
      .notif__foot {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 10px;
        margin-top: 7px;
        font-size: 10.5px;
        color: var(--wa-ink-faint);
      }
      .notif__link {
        display: inline-flex;
        align-items: center;
        gap: 3px;
        font-weight: 600;
        color: var(--wa-primary-deep);
        text-decoration: none;
      }
      .notif__link .material-symbols-outlined {
        font-size: 14px;
      }
      .notif__read {
        margin-left: auto;
        border: none;
        background: transparent;
        color: var(--wa-ink-faint);
        font-size: 10.5px;
        font-weight: 600;
        cursor: pointer;
        text-decoration: underline;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationsPage {
  private readonly data = inject(DataService);

  readonly items = computed(() => this.data.notificationsForCurrentRole());
  readonly unread = computed(() => this.items().filter((item) => !item.read).length);

  readonly filters: { value: NotificationFilter; label: string }[] = [
    { value: 'ALL', label: 'Toutes' },
    { value: 'UNREAD', label: 'Non lues' },
    { value: 'GAP', label: 'Écarts' },
    { value: 'TRAINING', label: 'Formation' },
    { value: 'EVALUATION', label: 'Évaluation' },
  ];

  readonly active = signal<NotificationFilter>('ALL');

  readonly filtered = computed(() => {
    const filter = this.active();
    const items = this.items();
    switch (filter) {
      case 'UNREAD':
        return items.filter((item) => !item.read);
      case 'GAP':
        return items.filter((item) => item.type === 'GAP_DETECTED' || item.type === 'GAP_QUEUED');
      case 'TRAINING':
        return items.filter((item) => item.type.startsWith('TRAINING') || item.type === 'CHANGES_REQUESTED' || item.type === 'REMEDIATION_CREATED');
      case 'EVALUATION':
        return items.filter(
          (item) =>
            item.type === 'EVALUATION_READY' ||
            item.type === 'EVALUATION_PASSED' ||
            item.type === 'EVALUATION_FAILED' ||
            item.type === 'CERTIFICATE_ISSUED',
        );
      default:
        return items;
    }
  });

  countOf(group: 'TRAINING' | 'EVALUATION'): number {
    if (group === 'TRAINING') {
      return this.items().filter((item) => item.type.startsWith('TRAINING')).length;
    }
    return this.items().filter((item) => item.type.startsWith('EVALUATION')).length;
  }

  read(notification: AppNotification): void {
    this.data.markNotificationRead(notification.id);
  }

  markAll(): void {
    this.data.markAllNotificationsRead();
  }

  iconFor(type: AppNotificationType): string {
    const icons: Record<AppNotificationType, string> = {
      GAP_DETECTED: 'track_changes',
      GAP_QUEUED: 'hourglass_top',
      TRAINING_SUBMITTED: 'forward_to_inbox',
      TRAINING_APPROVED: 'verified',
      TRAINING_REJECTED: 'block',
      CHANGES_REQUESTED: 'edit_note',
      TRAINING_STARTED: 'play_circle',
      TRAINING_MILESTONE: 'flag',
      TRAINING_COMPLETED: 'school',
      EVALUATION_READY: 'assignment',
      EVALUATION_PASSED: 'check_circle',
      EVALUATION_FAILED: 'cancel',
      CERTIFICATE_ISSUED: 'workspace_premium',
      REMEDIATION_CREATED: 'restart_alt',
      COLLECTION_FAILED: 'wifi_off',
      PROFILE_UPDATED: 'person',
    };
    return icons[type];
  }

  typeLabel(type: AppNotificationType): string {
    const labels: Record<AppNotificationType, string> = {
      GAP_DETECTED: 'Écart',
      GAP_QUEUED: 'Écart en attente',
      TRAINING_SUBMITTED: 'Parcours soumis',
      TRAINING_APPROVED: 'Parcours approuvé',
      TRAINING_REJECTED: 'Parcours rejeté',
      CHANGES_REQUESTED: 'Modification demandée',
      TRAINING_STARTED: 'Formation démarrée',
      TRAINING_MILESTONE: 'Jalon',
      TRAINING_COMPLETED: 'Formation terminée',
      EVALUATION_READY: 'Évaluation prête',
      EVALUATION_PASSED: 'Évaluation réussie',
      EVALUATION_FAILED: 'Évaluation échouée',
      CERTIFICATE_ISSUED: 'Certificat',
      REMEDIATION_CREATED: 'Remédiation',
      COLLECTION_FAILED: 'Collecte',
      PROFILE_UPDATED: 'Profil',
    };
    return labels[type];
  }

  when(value: string): string {
    return new Date(value).toLocaleString('fr-FR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
