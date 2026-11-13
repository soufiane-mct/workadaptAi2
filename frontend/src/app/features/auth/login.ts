import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Role, ROLE_LABELS } from '../../core/models';
import { DEMO_ACCOUNTS } from '../../core/data/mock-data';
import { AuthService } from '../../core/auth/auth.service';

interface RoleOption {
  role: Role;
  title: string;
  description: string;
  icon: string;
}

/** Page d'accueil après connexion, selon le rôle. */
const LANDING: Record<Role, string> = {
  EMPLOYEE: '/app/tableau-de-bord',
  MANAGER: '/app/validations',
  RH: '/app/rh',
  ADMIN: '/app/agents',
};

const OPTIONS: RoleOption[] = [
  {
    role: 'EMPLOYEE',
    title: 'Employé',
    description: 'Profil, compétences, parcours et certificats.',
    icon: 'person',
  },
  {
    role: 'MANAGER',
    title: 'Superviseur',
    description: 'Validation des parcours et suivi de l’équipe.',
    icon: 'approval',
  },
  {
    role: 'RH',
    title: 'Ressources humaines',
    description: 'Tendances, besoins de formation et indicateurs.',
    icon: 'groups',
  },
  {
    role: 'ADMIN',
    title: 'Administrateur',
    description: 'Comptes, rôles, audit et agents IA.',
    icon: 'settings',
  },
];

@Component({
  selector: 'wa-login',
  imports: [MatButtonModule, MatFormFieldModule, MatInputModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly options = OPTIONS;
  readonly selected = signal<Role>('EMPLOYEE');
  readonly email = signal(DEMO_ACCOUNTS[0].email);
  readonly demoAccounts = DEMO_ACCOUNTS;
  readonly roleLabels = ROLE_LABELS;

  readonly selectedAccount = computed(
    () => DEMO_ACCOUNTS.find((account) => account.role === this.selected()) ?? DEMO_ACCOUNTS[0],
  );

  selectRole(role: Role): void {
    this.selected.set(role);
    this.email.set(this.selectedAccount().email);
  }

  connect(): void {
    this.auth.login(this.selected());
    this.router.navigate([LANDING[this.selected()]]);
  }
}
