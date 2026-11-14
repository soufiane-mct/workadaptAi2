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

  readonly notifications = computed(() => {
    const role = this.auth.role();
    return role ? this.data.notificationsFor(role).slice(0, 6) : [];
  });

  readonly unreadCount = computed(() => {
    const role = this.auth.role();
    if (!role) {
      return 0;
    }
    return this.data
      .notificationsFor(role)
      .filter((notification) => !notification.read).length;
  });

  private readonly currentUrl = signal(this.router.url);

  readonly navGroups = computed<NavGroup[]>(() => {
    const pending =
      this.data.pendingApprovals().length +
      this.data.trainingRequests().filter((request) => request.status === 'PENDING').length;

    const items: NavItem[] = [
      { label: 'Tableau de bord', icon: 'space_dashboard', path: '/app/tableau-de-bord', roles: ['EMPLOYEE', 'MANAGER', 'RH', 'ADMIN'] },
      { label: 'Notifications', icon: 'notifications', path: '/app/notifications', roles: ['EMPLOYEE', 'MANAGER', 'RH', 'ADMIN'] },
      { label: 'Mon profil', icon: 'badge', path: '/app/profil', roles: ['EMPLOYEE'] },
      { label: 'Mes compétences', icon: 'radar', path: '/app/competences', roles: ['EMPLOYEE'] },
      { label: 'Mon parcours', icon: 'route', path: '/app/parcours', roles: ['EMPLOYEE'] },
      { label: 'Formats de formation', icon: 'category', path: '/app/formations', roles: ['EMPLOYEE'] },
      { label: 'Mes certificats', icon: 'workspace_premium', path: '/app/certificats', roles: ['EMPLOYEE'] },
      { label: 'Entretien IA', icon: 'forum', path: '/app/entretien', roles: ['EMPLOYEE'] },

      { label: 'Validations', icon: 'approval', path: '/app/validations', roles: ['MANAGER', 'ADMIN'], badge: pending },
      { label: 'Mon équipe', icon: 'groups', path: '/app/equipe', roles: ['MANAGER', 'ADMIN'] },

      { label: 'Vue RH', icon: 'insights', path: '/app/rh', roles: ['RH', 'ADMIN'] },
      { label: 'Besoins de formation', icon: 'priority_high', path: '/app/besoins-formation', roles: ['RH', 'ADMIN'] },

      { label: 'Suivi des formations', icon: 'route', path: '/app/suivi-formations', roles: ['MANAGER', 'ADMIN'] },
      { label: 'Résultats et évaluations', icon: 'fact_check', path: '/app/resultats', roles: ['MANAGER', 'ADMIN'] },
      { label: 'Tendances', icon: 'trending_up', path: '/app/tendances', roles: ['RH', 'ADMIN'] },
      { label: 'Formations et certifications', icon: 'workspace_premium', path: '/app/formations-certifications', roles: ['RH', 'ADMIN'] },
      { label: 'Rapports', icon: 'download', path: '/app/rapports', roles: ['RH', 'ADMIN'] },

      { label: 'Utilisateurs', icon: 'manage_accounts', path: '/app/utilisateurs', roles: ['ADMIN'] },
      { label: "Journal d'audit", icon: 'receipt_long', path: '/app/audit', roles: ['ADMIN'] },
      { label: 'Control Center', icon: 'smart_toy', path: '/app/agents', roles: ['ADMIN'] },
    ];

    const role = this.auth.role();
    const visible = items.filter((item) => !!role && item.roles.includes(role));

    const inGroup = (path: string, candidates: string[]) =>
      candidates.includes(path.slice('/app/'.length));

    const groups: NavGroup[] = [
      {
        title: 'Mon espace',
        items: visible.filter((item) =>
          inGroup(item.path, [
            'tableau-de-bord',
            'notifications',
            'profil',
            'competences',
            'parcours',
            'formations',
            'certificats',
            'entretien',
          ]),
        ),
      },
      {
        title: 'Pilotage',
        items: visible.filter((item) =>
          inGroup(item.path, ['validations', 'equipe', 'rh', 'besoins-formation']),
        ),
      },
      {
        title: 'Suivi et analyse',
        items: visible.filter((item) =>
          inGroup(item.path, [
            'suivi-formations',
            'resultats',
            'tendances',
            'formations-certifications',
            'rapports',
          ]),
        ),
      },
      {
        title: 'Administration',
        items: visible.filter((item) => inGroup(item.path, ['utilisateurs', 'audit', 'agents'])),
      },
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

  notificationIcon(type: string): string {
    switch (type) {
      case 'GAP_DETECTED':
        return 'radar';
      case 'TRAINING_SUBMITTED':
        return 'category';
      case 'TRAINING_APPROVED':
        return 'task_alt';
      case 'TRAINING_REJECTED':
        return 'block';
      case 'CHANGES_REQUESTED':
        return 'edit_note';
      case 'TRAINING_COMPLETED':
        return 'school';
      case 'EVALUATION_READY':
        return 'fact_check';
      case 'CERTIFICATE_ISSUED':
        return 'workspace_premium';
      default:
        return 'notifications';
    }
  }

  openNotification(notification: { id: string; link?: string; read: boolean }): void {
    if (!notification.read) {
      this.data.markNotificationRead(notification.id);
    }
    if (notification.link) {
      this.router.navigateByUrl(notification.link);
    }
  }

  markAllRead(): void {
    const role = this.auth.role();
    if (role) {
      this.data.markAllNotificationsRead(role);
    }
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
