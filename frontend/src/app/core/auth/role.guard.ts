import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Role } from '../models';
import { AuthService } from './auth.service';

/** Restreint une route à une liste de rôles (RBAC côté interface). */
export const roleGuard =
  (allowed: Role[]): CanActivateFn =>
  () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    if (!auth.isAuthenticated()) {
      return router.createUrlTree(['/login']);
    }

    if (auth.hasRole(...allowed)) {
      return true;
    }

    return router.createUrlTree(['/app/acces-refuse']);
  };
