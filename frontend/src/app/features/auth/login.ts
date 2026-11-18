import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { Role, ROLE_LABELS } from '../../core/models';
import { AuthService } from '../../core/auth/auth.service';

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
  readonly email = signal('soufiane.mechta@workadapt.demo');
  readonly password = signal('demo');

  select(role: Role): void {
    this.selected.set(role);
    const emails: Record<Role, string> = {
      EMPLOYEE: 'soufiane.mechta@workadapt.demo',
      MANAGER: 'ahmed.elfellah@workadapt.demo',
      RH: 'kawtar.souiyah@workadapt.demo',
      ADMIN: 'yassine.berrada@workadapt.demo',
    };
    this.email.set(emails[role]);
  }

  submit(event: Event): void {
    event.preventDefault();
    if (!this.email().trim() || !this.password().trim()) {
      return;
    }
    this.auth.login(this.selected());
    const redirect = this.route.snapshot.queryParamMap.get('redirect');
    void this.router.navigateByUrl(redirect ?? '/app/tableau-de-bord');
  }
}
