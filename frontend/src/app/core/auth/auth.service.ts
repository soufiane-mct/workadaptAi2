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
 * Authentification simulée et locale.
 *
 * Les comptes de démonstration sont sélectionnables par rôle. Les comptes
 * créés dans l'application restent disponibles sur ce navigateur et peuvent
 * être rouverts sans les confondre avec les profils de démonstration.
 * Aucun secret ni jeton réel n'est stocké : le backend remplacera cette couche
 * sans modifier les règles de rôle du frontend.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly _registeredAccounts = signal<User[]>(this.restoreRegisteredAccounts());
  private readonly _user = signal<User | null>(this.restore());

  readonly user = this._user.asReadonly();
  readonly registeredAccounts = this._registeredAccounts.asReadonly();
  readonly accounts = computed(() => [...DEMO_ACCOUNTS, ...this._registeredAccounts()]);
  readonly isAuthenticated = computed(() => this._user() !== null);
  readonly role = computed<Role | null>(() => this._user()?.role ?? null);

  login(role: Role): User {
    const account = DEMO_ACCOUNTS.find((candidate) => candidate.role === role);
    if (!account) {
      throw new Error(`Aucun compte de démonstration pour le rôle ${role}`);
    }
    this.openSession(account);
    return account;
  }

  /** Rouvre un compte créé sur ce navigateur. */
  loginById(id: string): User | undefined {
    const account = this.accounts().find((candidate) => candidate.id === id);
    if (!account) {
      return undefined;
    }
    this.openSession(account);
    return account;
  }

  logout(): void {
    this._user.set(null);
    localStorage.removeItem(STORAGE_KEY);
  }

  /** Inscription simulée : crée un compte employé et ouvre la session. */
  register(input: RegistrationInput): User {
    const email = input.email.trim().toLowerCase();
    if (this.accounts().some((account) => account.email.toLowerCase() === email)) {
      throw new Error('Un compte utilise déjà cette adresse professionnelle.');
    }

    const initials = `${input.firstName.charAt(0)}${input.lastName.charAt(0)}`.toUpperCase();
    const id = `usr-reg-${Date.now()}`;
    const user: User = {
      id,
      name: `${input.firstName.trim()} ${input.lastName.trim()}`.trim(),
      email: input.email.trim(),
      role: 'EMPLOYEE',
      jobTitle: input.jobTitle.trim(),
      department: input.department.trim() || 'Non renseigné',
      initials,
      employeeId: `emp-${id}`,
    };

    const accounts = [...this._registeredAccounts(), user];
    this._registeredAccounts.set(accounts);
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
    this.openSession(user);
    return user;
  }

  hasRole(...roles: Role[]): boolean {
    const current = this._user()?.role;
    return !!current && roles.includes(current);
  }

  private openSession(account: User): void {
    this._user.set(account);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(account));
  }

  private restore(): User | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return null;
      }
      const parsed = JSON.parse(raw) as User;
      // On ne fait pas confiance au stockage : on retrouve un compte connu.
      const known = [...DEMO_ACCOUNTS, ...this._registeredAccounts()];
      return known.find((candidate) => candidate.id === parsed.id) ?? null;
    } catch {
      return null;
    }
  }

  private restoreRegisteredAccounts(): User[] {
    try {
      const raw = localStorage.getItem(ACCOUNTS_KEY);
      if (!raw) {
        return [];
      }
      const parsed = JSON.parse(raw) as unknown;
      return Array.isArray(parsed)
        ? parsed.filter((account): account is User => this.isUser(account))
        : [];
    } catch {
      return [];
    }
  }

  private isUser(value: unknown): value is User {
    if (!value || typeof value !== 'object') {
      return false;
    }
    const candidate = value as Partial<User>;
    return (
      typeof candidate.id === 'string' &&
      candidate.id.startsWith('usr-reg-') &&
      typeof candidate.name === 'string' &&
      typeof candidate.email === 'string' &&
      candidate.role === 'EMPLOYEE' &&
      typeof candidate.employeeId === 'string' &&
      candidate.employeeId === `emp-${candidate.id}` &&
      typeof candidate.jobTitle === 'string' &&
      typeof candidate.department === 'string' &&
      typeof candidate.initials === 'string'
    );
  }
}
