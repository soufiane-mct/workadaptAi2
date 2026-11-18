import { BreakpointObserver } from '@angular/cdk/layout';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { map } from 'rxjs';
import { ROLE_LABELS, Role } from '../../core/models';
import { AuthService } from '../../core/auth/auth.service';
import { DataService } from '../../core/data/data.service';

interface NavItem {
  label: string;
  icon: string;
  path: string;
  badge?: number;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

@Component({
  selector: 'wa-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
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
  readonly unread = this.data.unreadNotifications;
  readonly mobile = toSignal(
    this.breakpoint.observe('(max-width: 960px)').pipe(map((state) => state.matches)),
    { initialValue: false },
  );
  readonly menuOpen = signal(false);

  readonly groups = computed<NavGroup[]>(() => {
    const role: Role = this.auth.role() ?? 'EMPLOYEE';
    if (role === 'MANAGER') {
      return [
        {
          title: 'Supervision',
          items: [
            { label: 'Tableau de bord', icon: 'space_dashboard', path: '/app/tableau-de-bord' },
            { label: 'Validations', icon: 'fact_check', path: '/app/validations', badge: this.data.pendingRequests().length },
            { label: 'Suivi des formations', icon: 'monitoring', path: '/app/suivi-formations' },
            { label: 'Résultats', icon: 'grading', path: '/app/resultats' },
            { label: 'Mon équipe', icon: 'groups', path: '/app/equipe' },
          ],
        },
        {
          title: 'Transversal',
          items: [
            { label: 'Notifications', icon: 'notifications', path: '/app/notifications', badge: this.unread() },
            { label: 'Confidentialité', icon: 'shield', path: '/app/confidentialite' },
          ],
        },
      ];
    }
    if (role === 'RH') {
      return [
        {
          title: 'Pilotage RH',
          items: [
            { label: 'Vue d’ensemble', icon: 'insights', path: '/app/rh' },
            { label: 'Besoins de formation', icon: 'school', path: '/app/rh/besoins' },
            { label: 'Tendances', icon: 'trending_up', path: '/app/rh/tendances' },
            { label: 'Rapports', icon: 'summarize', path: '/app/rh/rapports' },
            { label: 'Certifications', icon: 'workspace_premium', path: '/app/rh/certifications' },
            { label: 'Audit', icon: 'history', path: '/app/rh/audit' },
            { label: 'Utilisateurs', icon: 'manage_accounts', path: '/app/rh/utilisateurs' },
          ],
        },
        {
          title: 'Transversal',
          items: [
            { label: 'Notifications', icon: 'notifications', path: '/app/notifications', badge: this.unread() },
            { label: 'Confidentialité', icon: 'shield', path: '/app/confidentialite' },
          ],
        },
      ];
    }
    if (role === 'ADMIN') {
      return [
        {
          title: 'Administration',
          items: [
            { label: 'Vue système', icon: 'settings', path: '/app/admin' },
            { label: 'Agents IA', icon: 'smart_toy', path: '/app/agents' },
            { label: 'Audit', icon: 'history', path: '/app/rh/audit' },
          ],
        },
        {
          title: 'Transversal',
          items: [
            { label: 'Notifications', icon: 'notifications', path: '/app/notifications', badge: this.unread() },
            { label: 'Confidentialité', icon: 'shield', path: '/app/confidentialite' },
          ],
        },
      ];
    }
    return [
      {
        title: 'Mon parcours',
        items: [
          { label: 'Tableau de bord', icon: 'space_dashboard', path: '/app/tableau-de-bord' },
          { label: 'Mes écarts', icon: 'track_changes', path: '/app/ecarts', badge: this.data.actionableGaps().length },
          { label: 'Mes formations', icon: 'school', path: '/app/formations' },
          { label: 'Mes certificats', icon: 'workspace_premium', path: '/app/certificats' },
          { label: 'Collecte', icon: 'sensors', path: '/app/collecte' },
          { label: 'Veille', icon: 'radar', path: '/app/veille' },
        ],
      },
      {
        title: 'Mon profil',
        items: [
          { label: 'Profil professionnel', icon: 'person', path: '/app/profil' },
          { label: 'Entretien IA', icon: 'record_voice_over', path: '/app/entretien' },
          { label: 'Notifications', icon: 'notifications', path: '/app/notifications', badge: this.unread() },
          { label: 'Confidentialité', icon: 'shield', path: '/app/confidentialite' },
        ],
      },
    ];
  });

  toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  closeOnNavigate(): void {
    if (this.mobile()) {
      this.menuOpen.set(false);
    }
  }

  logout(): void {
    this.auth.logout();
    void this.router.navigate(['/login']);
  }

  markAllRead(): void {
    this.data.markAllNotificationsRead();
  }
}
