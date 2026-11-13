import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { DEMO_ACCOUNTS } from '../data/mock-data';
import { Role } from '../models';

const STORAGE_KEY = 'workadapt.session';

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
