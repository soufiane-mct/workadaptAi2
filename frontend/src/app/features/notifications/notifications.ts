import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../../core/auth/auth.service';
import { DataService } from '../../core/data/data.service';
import { AppNotification, ROLE_LABELS } from '../../core/models';
import { PageHeader } from '../../shared/ui/page-header';

/**
 * Centre de notifications, filtré par rôle et par audience.
 *
 * Chaque notification est produite par un événement réel du parcours :
 * écart détecté, demande transmise, décision du superviseur, formation
 * terminée, certificat délivré. Aucune notification n'est disciplinaire.
 */
@Component({
  selector: 'wa-notifications',
  imports: [DatePipe, RouterLink, MatButtonModule, PageHeader],
  templateUrl: './notifications.html',
  styleUrl: './notifications.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationsPage {
  private readonly data = inject(DataService);
  private readonly auth = inject(AuthService);

  readonly filter = signal<'ALL' | 'UNREAD'>('ALL');

  readonly role = computed(() => this.auth.role());
  readonly roleLabel = computed(() => {
    const role = this.role();
    return role ? ROLE_LABELS[role] : '';
  });

  readonly all = computed(() => {
    const role = this.role();
    return role ? this.data.notificationsFor(role) : [];
  });

  readonly visible = computed(() =>
    this.filter() === 'UNREAD'
      ? this.all().filter((notification) => !notification.read)
      : this.all(),
  );

  readonly unreadCount = computed(() => this.all().filter((notification) => !notification.read).length);

  markRead(notification: AppNotification): void {
    this.data.markNotificationRead(notification.id);
  }

  markAllRead(): void {
    const role = this.role();
    if (role) {
      this.data.markAllNotificationsRead(role);
    }
  }

  iconFor(type: AppNotification['type']): string {
    switch (type) {
      case 'GAP_DETECTED':
        return 'radar';
      case 'TRAINING_SUBMITTED':
        return 'category';
      case 'TRAINING_APPROVED':
        return 'task_alt';
      case 'TRAINING_REJECTED':
        return 'block';
      case 'CHANGES_REQUESTED':
        return 'edit_note';
      case 'TRAINING_COMPLETED':
        return 'school';
      case 'EVALUATION_READY':
        return 'fact_check';
      case 'CERTIFICATE_ISSUED':
        return 'workspace_premium';
      default:
        return 'notifications';
    }
  }

  toneFor(type: AppNotification['type']): string {
    switch (type) {
      case 'TRAINING_APPROVED':
      case 'CERTIFICATE_ISSUED':
        return 'wa-chip wa-chip--success';
      case 'TRAINING_REJECTED':
        return 'wa-chip wa-chip--danger';
      case 'CHANGES_REQUESTED':
        return 'wa-chip wa-chip--warning';
      case 'GAP_DETECTED':
        return 'wa-chip wa-chip--warning';
      default:
        return 'wa-chip wa-chip--info';
    }
  }

  labelFor(type: AppNotification['type']): string {
    switch (type) {
      case 'GAP_DETECTED':
        return 'Écart détecté';
      case 'TRAINING_SUBMITTED':
        return 'Demande transmise';
      case 'TRAINING_APPROVED':
        return 'Formation approuvée';
      case 'TRAINING_REJECTED':
        return 'Demande rejetée';
      case 'CHANGES_REQUESTED':
        return 'Modification demandée';
      case 'TRAINING_COMPLETED':
        return 'Formation terminée';
      case 'EVALUATION_READY':
        return 'Évaluation disponible';
      case 'CERTIFICATE_ISSUED':
        return 'Certificat délivré';
      default:
        return 'Notification';
    }
  }
}
