import { computed, Injectable, signal } from '@angular/core';
import { Role, User } from '../models';
import { DEMO_ACCOUNTS } from '../data/mock-data';

const STORAGE_KEY = 'workadapt.session';
const ACCOUNTS_KEY = 'workadapt.accounts';

export interface RegistrationInput {
  firstName: string;
  lastName: string;
  email: string;
  jobTitle: string;
  department: string;
}

/**
 * Authentification simulée.
 *
 * Le backend Spring Boot fournira un JWT ; ici on conserve simplement
 * l'utilisateur sélectionné dans le stockage local pour que le
 * rafraîchissement de la page ne déconnecte pas.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly _user = signal<User | null>(this.restore());

  readonly user = this._user.asReadonly();
  readonly isAuthenticated = computed(() => this._user() !== null);
  readonly role = computed<Role | null>(() => this._user()?.role ?? null);

  login(role: Role): User {
    const account = DEMO_ACCOUNTS.find((candidate) => candidate.role === role);
    if (!account) {
      throw new Error(`Aucun compte de démonstration pour le rôle ${role}`);
    }
    this._user.set(account);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(account));
    return account;
  }

  logout(): void {
    this._user.set(null);
    localStorage.removeItem(STORAGE_KEY);
  }

  /** Inscription simulée : crée un compte employé et ouvre la session. */
  register(input: RegistrationInput): User {
    const initials = `${input.firstName.charAt(0)}${input.lastName.charAt(0)}`.toUpperCase();
    const id = `usr-reg-${Date.now()}`;
    const user: User = {
      id,
      name: `${input.firstName} ${input.lastName}`.trim(),
      email: input.email,
      role: 'EMPLOYEE',
      jobTitle: input.jobTitle,
      department: input.department,
      initials,
      employeeId: `emp-${id}`,
    };
    const accounts = this.registeredAccounts();
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify([...accounts, user]));
    this._user.set(user);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    return user;
  }

  hasRole(...roles: Role[]): boolean {
    const current = this._user()?.role;
    return !!current && roles.includes(current);
  }

  private restore(): User | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return null;
      }
      const parsed = JSON.parse(raw) as User;
      // On ne fait pas confiance au stockage : on retrouve un compte connu.
      const known = [...DEMO_ACCOUNTS, ...this.registeredAccounts()];
      return known.find((candidate) => candidate.id === parsed.id) ?? null;
    } catch {
      return null;
    }
  }

  private registeredAccounts(): User[] {
    try {
      const raw = localStorage.getItem(ACCOUNTS_KEY);
      return raw ? (JSON.parse(raw) as User[]) : [];
    } catch {
      return [];
    }
  }
}
