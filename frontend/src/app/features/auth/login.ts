import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Role, ROLE_LABELS } from '../../core/models';
import { AuthService } from '../../core/auth/auth.service';
import { DEMO_ACCOUNTS } from '../../core/data/mock-data';

const ROLES: Role[] = ['EMPLOYEE', 'MANAGER', 'RH', 'ADMIN'];

const DESCRIPTIONS: Record<Role, string> = {
  EMPLOYEE: 'Suivre ses écarts, sa formation et ses certificats.',
  MANAGER: 'Valider les parcours et suivre son équipe.',
  RH: 'Piloter les besoins et les indicateurs agrégés.',
  ADMIN: 'Superviser la plateforme et les agents IA.',
};

@Component({
  selector: 'wa-login',
  imports: [RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly roles = ROLES;
  readonly labels = ROLE_LABELS;
  readonly descriptions = DESCRIPTIONS;
  readonly selected = signal<Role>('EMPLOYEE');
  readonly selectedAccount = computed(() =>
    DEMO_ACCOUNTS.find((account) => account.role === this.selected()),
  );
  readonly registeredAccounts = this.auth.registeredAccounts;

  select(role: Role): void {
    this.selected.set(role);
  }

  submit(event: Event): void {
    event.preventDefault();
    this.auth.login(this.selected());
    this.navigate();
  }

  openRegisteredAccount(id: string): void {
    if (this.auth.loginById(id)) {
      this.navigate();
    }
  }

  private navigate(): void {
    const redirect = this.route.snapshot.queryParamMap.get('redirect');
    void this.router.navigateByUrl(redirect ?? '/app/tableau-de-bord');
  }
}
