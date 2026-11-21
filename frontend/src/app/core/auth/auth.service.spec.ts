import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { DEMO_ACCOUNTS } from '../data/mock-data';
import { Role } from '../models';

const STORAGE_KEY = 'workadapt.session';
const ACCOUNTS_KEY = 'workadapt.accounts';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(AuthService);
  });

  afterEach(() => localStorage.clear());

  it('démarre sans utilisateur quand le stockage est vide', () => {
    expect(service.isAuthenticated()).toBe(false);
    expect(service.user()).toBeNull();
    expect(service.role()).toBeNull();
  });

  it('connecte un compte de démonstration et persiste la session', () => {
    const user = service.login('MANAGER');

    expect(user.role).toBe('MANAGER');
    expect(service.isAuthenticated()).toBe(true);
    expect(service.role()).toBe('MANAGER');
    expect(localStorage.getItem(STORAGE_KEY)).toContain(user.id);
  });

  it('restaure la session au rechargement à partir de l’identifiant', () => {
    service.login('RH');

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    const restored = TestBed.inject(AuthService);

    expect(restored.role()).toBe('RH');
  });

  it('ignore un identifiant inconnu présent dans le stockage', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ id: 'compte-forge' }));

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    const restored = TestBed.inject(AuthService);

    expect(restored.isAuthenticated()).toBe(false);
  });

  it('ignore un contenu de stockage invalide', () => {
    localStorage.setItem(STORAGE_KEY, '{pas-du-json');

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    const restored = TestBed.inject(AuthService);

    expect(restored.isAuthenticated()).toBe(false);
  });

  it('déconnecte et nettoie le stockage', () => {
    service.login('EMPLOYEE');
    service.logout();

    expect(service.isAuthenticated()).toBe(false);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('refuse une adresse professionnelle déjà utilisée', () => {
    service.register({
      firstName: 'Nora',
      lastName: 'Martin',
      email: 'nora.martin@exemple.test',
      jobTitle: 'Analyste',
      department: 'Opérations',
    });

    expect(() =>
      service.register({
        firstName: 'Autre',
        lastName: 'Collaboratrice',
        email: ' NORA.MARTIN@EXEMPLE.TEST ',
        jobTitle: 'Chargée de mission',
        department: 'Opérations',
      }),
    ).toThrowError('Un compte utilise déjà cette adresse professionnelle.');
  });

  it('conserve et rouvre un compte créé sur le navigateur', () => {
    const registered = service.register({
      firstName: 'Nora',
      lastName: 'Martin',
      email: 'nora.martin@exemple.test',
      jobTitle: 'Analyste',
      department: 'Opérations',
    });

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    const restored = TestBed.inject(AuthService);

    expect(restored.registeredAccounts().map((account) => account.id)).toContain(registered.id);
    expect(restored.loginById(registered.id)?.employeeId).toBe(registered.employeeId);
  });

  it('rejette un compte local altéré pour usurper un rôle ou un espace collaborateur', () => {
    const forgedAccount = {
      id: 'usr-reg-forged',
      name: 'Compte Altéré',
      email: 'forge@exemple.test',
      role: 'ADMIN',
      jobTitle: 'Administrateur',
      department: 'Systèmes',
      initials: 'CA',
      employeeId: 'emp-0001',
    };
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify([forgedAccount]));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(forgedAccount));

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    const restored = TestBed.inject(AuthService);

    expect(restored.registeredAccounts()).toEqual([]);
    expect(restored.isAuthenticated()).toBe(false);
    expect(restored.role()).toBeNull();
  });

  it('contrôle les rôles autorisés', () => {
    service.login('ADMIN');

    expect(service.hasRole('ADMIN')).toBe(true);
    expect(service.hasRole('ADMIN', 'RH')).toBe(true);
    expect(service.hasRole('EMPLOYEE')).toBe(false);
  });

  it('dispose d’un compte de démonstration pour chaque rôle', () => {
    const roles: Role[] = ['EMPLOYEE', 'MANAGER', 'RH', 'ADMIN'];

    for (const role of roles) {
      expect(DEMO_ACCOUNTS.some((account) => account.role === role)).toBe(true);
      expect(service.login(role).role).toBe(role);
    }
  });
});
