import { BreakpointObserver } from '@angular/cdk/layout';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  HostListener,
  inject,
  OnDestroy,
  OnInit,
  signal,
  ViewChild,
} from '@angular/core';
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
export class Shell implements OnInit, OnDestroy {
  @ViewChild('menuToggle') private menuToggle?: ElementRef<HTMLButtonElement>;
  @ViewChild('sideNav') private sideNav?: ElementRef<HTMLElement>;

  private readonly auth = inject(AuthService);
  private readonly data = inject(DataService);
  private readonly router = inject(Router);
  private readonly breakpoint = inject(BreakpointObserver);

  ngOnInit(): void {
    // La collecte est permanente (CDC) : elle tourne dès que l'application
    // est ouverte, sans dépendre d'un clic sur un bouton.
    this.data.collectionService.startAutoCollection();
  }

  ngOnDestroy(): void {
    this.data.collectionService.stopAutoCollection();
    if (this.focusTimer) {
      clearTimeout(this.focusTimer);
    }
  }

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
  private focusTimer: ReturnType<typeof setTimeout> | undefined;

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
          // Vues RH strictement agrégées : aucune identité, aucun journal
          // nominatif, aucun annuaire. Ces écrans sont réservés à
          // l'administrateur.
          title: 'Pilotage RH',
          items: [
            { label: 'Vue d’ensemble', icon: 'insights', path: '/app/rh' },
            { label: 'Besoins de formation', icon: 'school', path: '/app/rh/besoins' },
            { label: 'Tendances', icon: 'trending_up', path: '/app/rh/tendances' },
            { label: 'Rapports', icon: 'summarize', path: '/app/rh/rapports' },
            { label: 'Certifications', icon: 'workspace_premium', path: '/app/rh/certifications' },
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
            { label: 'Journal d’audit', icon: 'history', path: '/app/rh/audit' },
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
    if (this.menuOpen()) {
      this.closeMenu(true);
    } else {
      this.openMenu();
    }
  }

  openMenu(): void {
    this.menuOpen.set(true);
    this.scheduleFocus(() => this.focusFirstInMenu());
  }

  closeMenu(restoreFocus = true): void {
    this.menuOpen.set(false);
    if (restoreFocus) {
      this.scheduleFocus(() => this.menuToggle?.nativeElement.focus());
    }
  }

  closeOnNavigate(): void {
    if (this.mobile()) {
      // La navigation va remplacer le contenu : le focus ne doit pas revenir
      // sur le bouton du menu qui n'est plus dans le contexte utile.
      this.closeMenu(false);
    }
  }

  /** Échap ferme le tiroir et Tab reste piégé tant qu'il est ouvert. */
  @HostListener('document:keydown', ['$event'])
  onDocumentKeydown(event: KeyboardEvent): void {
    if (!this.mobile() || !this.menuOpen()) {
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      this.closeMenu(true);
      return;
    }
    if (event.key !== 'Tab') {
      return;
    }

    const focusable = this.menuFocusableElements();
    if (focusable.length === 0) {
      event.preventDefault();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;
    if (!this.sideNav?.nativeElement.contains(active)) {
      event.preventDefault();
      first.focus();
    } else if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  private menuFocusableElements(): HTMLElement[] {
    const nav = this.sideNav?.nativeElement;
    if (!nav) {
      return [];
    }
    return Array.from(
      nav.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((element) => !element.hasAttribute('disabled') && element.getAttribute('aria-hidden') !== 'true');
  }

  private focusFirstInMenu(): void {
    this.menuFocusableElements()[0]?.focus();
  }

  private scheduleFocus(action: () => void): void {
    if (this.focusTimer) {
      clearTimeout(this.focusTimer);
    }
    this.focusTimer = setTimeout(() => {
      this.focusTimer = undefined;
      action();
    });
  }

  logout(): void {
    this.auth.logout();
    void this.router.navigate(['/login']);
  }

  markAllRead(): void {
    this.data.markAllNotificationsRead();
  }
}
