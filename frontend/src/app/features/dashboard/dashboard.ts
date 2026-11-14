import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { EmployeeDashboard } from '../employee/dashboard';
import { ManagerDashboard } from '../manager/manager-dashboard';
import { HrDashboard } from '../hr/hr-dashboard';
import { AdminDashboard } from '../admin/admin-dashboard';

/**
 * Tableau de bord unique, distribué selon le rôle de l'utilisateur connecté.
 *
 * Auparavant, la route `/app/tableau-de-bord` affichait le dashboard personnel
 * de l'employé pour tout le monde. Chaque rôle dispose désormais de sa propre
 * vue et de ses propres données (CDC §11.3 et §11.4).
 */
@Component({
  selector: 'wa-dashboard-dispatcher',
  imports: [EmployeeDashboard, ManagerDashboard, HrDashboard, AdminDashboard],
  template: `
    @switch (role()) {
      @case ('EMPLOYEE') {
        <wa-employee-dashboard />
      }
      @case ('MANAGER') {
        <wa-manager-dashboard />
      }
      @case ('RH') {
        <wa-hr-dashboard />
      }
      @case ('ADMIN') {
        <wa-admin-dashboard />
      }
      @default {
        <wa-employee-dashboard />
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardDispatcher {
  private readonly auth = inject(AuthService);

  readonly role = computed(() => this.auth.role());
}
