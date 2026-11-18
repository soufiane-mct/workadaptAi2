import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { EmployeeDashboard } from '../../features/employee/dashboard';
import { ManagerDashboard } from '../../features/supervisor/manager-dashboard';
import { HrDashboard } from '../../features/hr/hr-dashboard';
import { AdminPage } from '../../features/admin/admin';

@Component({
  selector: 'wa-dashboard-dispatcher',
  imports: [EmployeeDashboard, ManagerDashboard, HrDashboard, AdminPage],
  template: `
    @switch (role()) {
      @case ('MANAGER') {
        <wa-manager-dashboard />
      }
      @case ('RH') {
        <wa-hr-dashboard />
      }
      @case ('ADMIN') {
        <wa-admin-page />
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
  readonly role = computed(() => this.auth.role() ?? 'EMPLOYEE');
}
