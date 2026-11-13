import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { BreakpointObserver } from '@angular/cdk/layout';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { Role, ROLE_LABELS } from '../../core/models';
import { AuthService } from '../../core/auth/auth.service';
import { DataService } from '../../core/data/data.service';

interface NavItem {
  label: string;
  icon: string;
  path: string;
  roles: Role[];
  badge?: number;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

@Component({
  selector: 'wa-shell',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatSidenavModule,
    MatToolbarModule,
    MatButtonModule,
    MatMenuModule,
  ],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Shell {
  private readonly auth = inject(AuthService);
  private readonly data = inject(DataService);
  private readonly router = inject(Router);
  private readonly breakpoint = inject(BreakpointObserver);

  readonly user = this.auth.user;
  readonly roleLabel = computed(() => {
    const role = this.auth.role();
    return role ? ROLE_LABELS[role] : '';
  });

  readonly isHandset = toSignal(
    this.breakpoint.observe('(max-width: 1000px)').pipe(map((result) => result.matches)),
    { initialValue: false },
  );

  readonly sidenavMode = computed<'over' | 'side'>(() => (this.isHandset() ? 'over' : 'side'));

  private readonly currentUrl = signal(this.router.url);

  readonly navGroups = computed<NavGroup[]>(() => {
    const pending = this.data.pendingApprovals().length;

    const items: NavItem[] = [
      { label: 'Tableau de bord', icon: 'space_dashboard', path: '/app/tableau-de-bord', roles: ['EMPLOYEE', 'MANAGER', 'RH', 'ADMIN'] },
      { label: 'Mon profil', icon: 'badge', path: '/app/profil', roles: ['EMPLOYEE'] },
      { label: 'Mes compétences', icon: 'radar', path: '/app/competences', roles: ['EMPLOYEE'] },
      { label: 'Mon parcours', icon: 'route', path: '/app/parcours', roles: ['EMPLOYEE'] },
      { label: 'Formats de formation', icon: 'category', path: '/app/formations', roles: ['EMPLOYEE'] },
      { label: 'Mes certificats', icon: 'workspace_premium', path: '/app/certificats', roles: ['EMPLOYEE'] },
      { label: 'Entretien IA', icon: 'forum', path: '/app/entretien', roles: ['EMPLOYEE'] },
      { label: 'Validations', icon: 'approval', path: '/app/validations', roles: ['MANAGER', 'ADMIN'], badge: pending },
      { label: 'Vue RH', icon: 'groups', path: '/app/rh', roles: ['RH', 'ADMIN'] },
      { label: 'Utilisateurs', icon: 'manage_accounts', path: '/app/utilisateurs', roles: ['ADMIN'] },
      { label: "Journal d'audit", icon: 'receipt_long', path: '/app/audit', roles: ['ADMIN'] },
      { label: 'Control Center', icon: 'smart_toy', path: '/app/agents', roles: ['ADMIN'] },
    ];

    const role = this.auth.role();
    const visible = items.filter((item) => !!role && item.roles.includes(role));

    const groups: NavGroup[] = [
      { title: 'Mon espace', items: visible.filter((item) => item.path.includes('tableau-de-bord') || ['profil', 'competences', 'parcours', 'formations', 'certificats', 'entretien'].some((p) => item.path.endsWith(p))) },
      { title: 'Pilotage', items: visible.filter((item) => ['validations', 'rh', 'utilisateurs', 'audit'].some((p) => item.path.endsWith(p))) },
      { title: 'Technique', items: visible.filter((item) => item.path.endsWith('agents')) },
    ];

    return groups.filter((group) => group.items.length > 0);
  });

  readonly pageTitle = computed(() => {
    const url = this.currentUrl();
    if (url.startsWith('/app/acces-refuse')) {
      return 'Accès refusé';
    }
    if (url.includes('/evaluation')) {
      return 'Évaluation finale';
    }
    for (const group of this.navGroups()) {
      const match = group.items.find((item) => url.startsWith(item.path));
      if (match) {
        return match.label;
      }
    }
    return 'WorkAdapt AI';
  });

  constructor() {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        map((event) => event.urlAfterRedirects),
      )
      .subscribe((url) => {
        this.currentUrl.set(url);
      });
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
