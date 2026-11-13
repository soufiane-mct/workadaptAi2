import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
  UrlTree,
  provideRouter,
} from '@angular/router';
import { AuthService } from './auth.service';
import { authGuard } from './auth.guard';
import { roleGuard } from './role.guard';

const route = {} as ActivatedRouteSnapshot;
const state = { url: '/app/validations' } as RouterStateSnapshot;

describe('Gardes de route', () => {
  let auth: AuthService;
  let router: Router;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    auth = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
  });

  afterEach(() => localStorage.clear());

  /** Sérialise une redirection pour la comparer sans dépendre du type concret. */
  function redirectTo(result: unknown): string {
    return result === true ? 'AUTORISÉ' : router.serializeUrl(result as UrlTree);
  }

  describe('authGuard', () => {
    it('laisse passer un utilisateur authentifié', () => {
      auth.login('EMPLOYEE');

      const result = TestBed.runInInjectionContext(() => authGuard(route, state));
      expect(result).toBe(true);
    });

    it('redirige vers la connexion en conservant l’URL demandée', () => {
      const result = TestBed.runInInjectionContext(() => authGuard(route, state));

      expect(redirectTo(result)).toBe('/login?redirect=%2Fapp%2Fvalidations');
    });
  });

  describe('roleGuard', () => {
    it('redirige vers la connexion sans session', () => {
      const result = TestBed.runInInjectionContext(() =>
        roleGuard(['MANAGER'])(route, state),
      );

      expect(redirectTo(result)).toBe('/login');
    });

    it('refuse un rôle non autorisé via la page d’accès refusé', () => {
      auth.login('EMPLOYEE');

      const result = TestBed.runInInjectionContext(() =>
        roleGuard(['MANAGER', 'ADMIN'])(route, state),
      );

      expect(redirectTo(result)).toBe('/app/acces-refuse');
    });

    it('autorise un rôle présent dans la liste', () => {
      auth.login('MANAGER');

      const result = TestBed.runInInjectionContext(() =>
        roleGuard(['MANAGER', 'ADMIN'])(route, state),
      );

      expect(result).toBe(true);
    });
  });
});
