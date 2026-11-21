import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  CanActivateFn,
  Router,
  UrlTree,
  provideRouter,
} from '@angular/router';
import { Role } from './core/models';
import { AuthService } from './core/auth/auth.service';
import { routes } from './app.routes';

const ROLES: Role[] = ['EMPLOYEE', 'MANAGER', 'RH', 'ADMIN'];

/** Matrice contractuelle des écrans protégés par rôle. */
const PROTECTED_ROUTES: ReadonlyArray<{ path: string; roles: Role[] }> = [
  { path: 'onboarding', roles: ['EMPLOYEE'] },
  { path: 'collecte', roles: ['EMPLOYEE'] },
  { path: 'ecarts', roles: ['EMPLOYEE'] },
  { path: 'ecarts/:gapId', roles: ['EMPLOYEE'] },
  { path: 'formations', roles: ['EMPLOYEE'] },
  { path: 'formations/:requestId', roles: ['EMPLOYEE'] },
  { path: 'evaluations/:requestId', roles: ['EMPLOYEE'] },
  { path: 'certificats', roles: ['EMPLOYEE'] },
  { path: 'certificats/:id', roles: ['EMPLOYEE'] },
  { path: 'veille', roles: ['EMPLOYEE'] },
  { path: 'profil', roles: ['EMPLOYEE'] },
  { path: 'entretien', roles: ['EMPLOYEE'] },
  { path: 'validations', roles: ['MANAGER'] },
  { path: 'validations/:requestId', roles: ['MANAGER'] },
  { path: 'suivi-formations', roles: ['MANAGER', 'ADMIN'] },
  { path: 'resultats', roles: ['MANAGER', 'ADMIN'] },
  { path: 'equipe', roles: ['MANAGER', 'ADMIN'] },
  { path: 'agents', roles: ['ADMIN', 'RH'] },
  { path: 'admin', roles: ['ADMIN'] },
  { path: 'rh', roles: ['RH', 'ADMIN'] },
  { path: 'rh/besoins', roles: ['RH', 'ADMIN'] },
  { path: 'rh/tendances', roles: ['RH', 'ADMIN'] },
  { path: 'rh/rapports', roles: ['RH', 'ADMIN'] },
  { path: 'rh/certifications', roles: ['RH', 'ADMIN'] },
  { path: 'rh/audit', roles: ['ADMIN'] },
  { path: 'rh/utilisateurs', roles: ['ADMIN'] },
];

describe('Matrice des routes par rôle', () => {
  let auth: AuthService;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
    auth = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
  });

  function childRoute(path: string) {
    const appRoute = routes.find((route) => route.path === 'app');
    const route = appRoute?.children?.find((candidate) => candidate.path === path);
    expect(route, `La route ${path} doit exister`).toBeDefined();
    return route!;
  }

  function redirectTo(result: unknown): string {
    return result === true ? 'AUTORISÉ' : router.serializeUrl(result as UrlTree);
  }

  it('protège chaque écran personnel avec le rôle EMPLOYEE', () => {
    const personalPaths = PROTECTED_ROUTES.filter((entry) => entry.roles.length === 1 && entry.roles[0] === 'EMPLOYEE');

    for (const entry of personalPaths) {
      const route = childRoute(entry.path);
      expect(route.canActivate?.length, `${entry.path} doit avoir un garde`).toBeGreaterThan(0);
    }
  });

  it('applique exactement les rôles autorisés pour chaque route protégée', () => {
    for (const entry of PROTECTED_ROUTES) {
      const route = childRoute(entry.path);
      const guard = route.canActivate?.[0] as CanActivateFn | undefined;
      expect(guard, `${entry.path} doit avoir un garde`).toBeDefined();

      for (const role of ROLES) {
        auth.login(role);
        const result = TestBed.runInInjectionContext(() =>
          guard!({} as ActivatedRouteSnapshot, { url: `/app/${entry.path}` } as never),
        );

        if (entry.roles.includes(role)) {
          expect(redirectTo(result), `${role} doit accéder à ${entry.path}`).toBe('AUTORISÉ');
        } else {
          expect(redirectTo(result), `${role} ne doit pas accéder à ${entry.path}`).toBe(
            '/app/acces-refuse',
          );
        }
      }
    }
  });

  it('réserve le journal d’audit et l’annuaire à l’administrateur', () => {
    for (const path of ['rh/audit', 'rh/utilisateurs']) {
      const guard = childRoute(path).canActivate?.[0] as CanActivateFn;
      auth.login('RH');
      expect(
        redirectTo(
          TestBed.runInInjectionContext(() =>
            guard({} as ActivatedRouteSnapshot, { url: `/app/${path}` } as never),
          ),
        ),
      ).toBe('/app/acces-refuse');

      auth.login('ADMIN');
      expect(
        redirectTo(
          TestBed.runInInjectionContext(() =>
            guard({} as ActivatedRouteSnapshot, { url: `/app/${path}` } as never),
          ),
        ),
      ).toBe('AUTORISÉ');
    }
  });

  it('réserve l’approbation des parcours au gestionnaire', () => {
    const guard = childRoute('validations').canActivate?.[0] as CanActivateFn;

    for (const role of ['EMPLOYEE', 'RH', 'ADMIN'] as Role[]) {
      auth.login(role);
      expect(
        redirectTo(
          TestBed.runInInjectionContext(() =>
            guard({} as ActivatedRouteSnapshot, { url: '/app/validations' } as never),
          ),
        ),
      ).toBe('/app/acces-refuse');
    }
  });
});
