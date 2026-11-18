import { computed, Injectable, signal } from '@angular/core';
import { AppNotification, AppNotificationType, Role } from '../models';
import { INITIAL_NOTIFICATIONS } from './mock-data';

/**
 * Notifications applicatives, ciblées par rôle et par employé.
 * Chaque étape du parcours produit une notification : la boucle doit rester
 * lisible pour l’employé comme pour le superviseur.
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly _notifications = signal<AppNotification[]>(INITIAL_NOTIFICATIONS);
  readonly notifications = this._notifications.asReadonly();

  readonly unread = computed(() => this._notifications().filter((item) => !item.read).length);

  notify(input: {
    type: AppNotificationType;
    title: string;
    message: string;
    audience: Role[];
    link?: string;
    employeeId?: string;
  }): AppNotification {
    const notification: AppNotification = {
      id: `ntf-${Date.now()}-${this._notifications().length}`,
      type: input.type,
      title: input.title,
      message: input.message,
      at: new Date().toISOString(),
      read: false,
      audience: input.audience,
      link: input.link,
      employeeId: input.employeeId,
    };
    this._notifications.update((items) => [notification, ...items]);
    return notification;
  }

  forRole(role: Role): AppNotification[] {
    return [...this._notifications()]
      .filter((item) => item.audience.includes(role))
      .sort((a, b) => b.at.localeCompare(a.at));
  }

  unreadFor(role: Role): number {
    return this.forRole(role).filter((item) => !item.read).length;
  }

  markRead(id: string): void {
    this._notifications.update((items) =>
      items.map((item) => (item.id === id ? { ...item, read: true } : item)),
    );
  }

  markAllRead(role: Role): void {
    this._notifications.update((items) =>
      items.map((item) => (item.audience.includes(role) ? { ...item, read: true } : item)),
    );
  }
}
