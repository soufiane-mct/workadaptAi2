import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { AppNotification, AppNotificationType, Role } from '../models';
import { INITIAL_NOTIFICATIONS } from './mock-data';
import { DemoStateStore } from './demo-state.store';

/**
 * Notifications applicatives, ciblées par rôle et par employé.
 * Chaque étape du parcours produit une notification : la boucle doit rester
 * lisible pour l’employé comme pour le superviseur.
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly store = inject(DemoStateStore);

  private readonly _notifications = signal<AppNotification[]>(
    this.store.read<AppNotification[]>('notifications.items', INITIAL_NOTIFICATIONS),
  );
  readonly notifications = this._notifications.asReadonly();

  readonly unread = computed(() => this._notifications().filter((item) => !item.read).length);

  constructor() {
    effect(() => {
      this.store.write('notifications.items', this._notifications());
    });
  }

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

  /**
   * Notifications visibles pour un rôle donné.
   *
   * Un employé ne voit que ses propres notifications ; les rôles
   * d'encadrement et les RH voient l'ensemble de la boucle.
   */
  forRole(role: Role, employeeId?: string): AppNotification[] {
    return [...this._notifications()]
      .filter((item) => item.audience.includes(role))
      .filter((item) => this.visibleTo(item, role, employeeId))
      .sort((a, b) => b.at.localeCompare(a.at));
  }

  unreadFor(role: Role, employeeId?: string): number {
    return this.forRole(role, employeeId).filter((item) => !item.read).length;
  }

  markRead(id: string): void {
    this._notifications.update((items) =>
      items.map((item) => (item.id === id ? { ...item, read: true } : item)),
    );
  }

  markAllRead(role: Role, employeeId?: string): void {
    const visible = new Set(this.forRole(role, employeeId).map((item) => item.id));
    this._notifications.update((items) =>
      items.map((item) =>
        visible.has(item.id) ? { ...item, read: true } : item,
      ),
    );
  }

  /** Une notification d'employé ne quitte jamais le périmètre de son employé. */
  private visibleTo(item: AppNotification, role: Role, employeeId?: string): boolean {
    if (role !== 'EMPLOYEE') {
      return true;
    }
    return !!employeeId && item.employeeId === employeeId;
  }

  clearEmployee(employeeId: string): void {
    this._notifications.update((items) =>
      items.filter((item) => item.employeeId !== employeeId),
    );
  }

  reset(): void {
    this._notifications.set(INITIAL_NOTIFICATIONS.map((item) => ({ ...item })));
  }
}
