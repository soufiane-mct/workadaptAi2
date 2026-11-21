import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ROLE_LABELS, Role } from '../../core/models';
import { DataService } from '../../core/data/data.service';

interface DirectoryUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  jobTitle: string;
  department: string;
  status: 'ACTIVE' | 'INVITED' | 'DISABLED';
}

@Component({
  selector: 'wa-hr-users-page',
  styleUrl: '../pages.scss',
  template: `
    <div class="page">
      <header class="page-head">
        <div>
          <h1>Utilisateurs et rôles</h1>
          <p>
            Annuaire administratif : identité, rôle, statut. Aucun niveau de compétence, aucun
            écart, aucun résultat d’évaluation n’est accessible depuis cette page. Les données de
            développement restent dans leurs domaines et les vues RH restent agrégées.
          </p>
        </div>
        <div class="page-head__actions">
          <span class="wa-chip wa-chip--neutral">Annuaire administratif</span>
        </div>
      </header>

      @if (message()) {
        <p class="note" [class.note--ok]="messageOk()" [class.note--danger]="!messageOk()">
          {{ message() }}
        </p>
      }

      <div class="role-grid">
        @for (role of roles; track role) {
          <div class="role-card">
            <span class="material-symbols-outlined">{{ roleIcon(role) }}</span>
            <div>
              <strong>{{ roleLabels[role] }}</strong>
              <small>{{ countRole(role) }} compte(s)</small>
            </div>
            <button class="btn btn--ghost btn--small" type="button" (click)="active.set(role)">
              Filtrer
            </button>
          </div>
        }
      </div>

      <div class="split">
        <section class="panel">
          <div class="toolbar" style="margin-bottom: 12px">
            <div class="filters">
              <button type="button" class="filter" [class.filter--on]="active() === 'ALL'" (click)="active.set('ALL')">
                Tous
              </button>
              @for (role of roles; track role) {
                <button type="button" class="filter" [class.filter--on]="active() === role" (click)="active.set(role)">
                  {{ roleLabels[role] }}
                </button>
              }
            </div>
            <div class="toolbar__spacer"></div>
            <input
              class="wa-input search"
              type="search"
              placeholder="Rechercher un nom, un département…"
              [value]="query()"
              (input)="query.set($any($event.target).value)"
            />
          </div>

          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>E-mail</th>
                  <th>Rôle</th>
                  <th>Poste</th>
                  <th>Département</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                @for (user of filtered(); track user.id) {
                  <tr>
                    <td>
                      <span class="user">
                        <span class="user__initials">{{ initials(user.name) }}</span>
                        <strong>{{ user.name }}</strong>
                      </span>
                    </td>
                    <td class="wa-small">{{ user.email }}</td>
                    <td><span class="wa-chip wa-chip--neutral">{{ roleLabels[user.role] }}</span></td>
                    <td class="wa-small">{{ user.jobTitle }}</td>
                    <td class="wa-small">{{ user.department }}</td>
                    <td>
                      <span class="wa-chip" [class]="statusClass(user.status)">
                        {{ statusLabel(user.status) }}
                      </span>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          @if (filtered().length === 0) {
            <p class="empty">Aucun utilisateur ne correspond à ce filtre.</p>
          }
        </section>

        <div style="display: flex; flex-direction: column; gap: 18px">
          <section class="panel">
            <h2>Inviter un utilisateur</h2>
            <p class="panel__sub">
              L’invitation est simulée et crée une entrée locale en statut « Invité ». Aucun accès
              réel n’est ouvert.
            </p>
            <div class="form-grid">
              <label class="wa-field">
                <span class="wa-field__label">Nom complet</span>
                <input class="wa-input" [value]="newName()" (input)="newName.set($any($event.target).value)" placeholder="Ex. Imane Cherkaoui" />
              </label>
              <label class="wa-field">
                <span class="wa-field__label">E-mail professionnel</span>
                <input class="wa-input" type="email" [value]="newEmail()" (input)="newEmail.set($any($event.target).value)" placeholder="prenom.nom@entreprise.demo" />
              </label>
              <label class="wa-field">
                <span class="wa-field__label">Rôle</span>
                <select class="wa-select" [value]="newRole()" (change)="newRole.set($any($event.target).value)">
                  @for (role of roles; track role) {
                    <option [value]="role">{{ roleLabels[role] }}</option>
                  }
                </select>
              </label>
              <label class="wa-field">
                <span class="wa-field__label">Département</span>
                <input class="wa-input" [value]="newDepartment()" (input)="newDepartment.set($any($event.target).value)" placeholder="Ex. Ingénierie" />
              </label>
            </div>
            <button class="btn btn--primary" type="button" style="margin-top: 10px" (click)="invite()">
              <span class="material-symbols-outlined">person_add</span>
              Envoyer l’invitation (simulée)
            </button>
          </section>

          <section class="panel">
            <h2>Séparation des domaines</h2>
            <div class="domain-list">
              <div>
                <span class="material-symbols-outlined">person</span>
                <div>
                  <strong>Identité et rôle</strong>
                  <small>Annuaire administratif : cette page.</small>
                </div>
              </div>
              <div>
                <span class="material-symbols-outlined">track_changes</span>
                <div>
                  <strong>Compétences et écarts</strong>
                  <small>Profil employé et validation superviseur uniquement.</small>
                </div>
              </div>
              <div>
                <span class="material-symbols-outlined">grading</span>
                <div>
                  <strong>Évaluations et certificats</strong>
                  <small>Domaine évaluation et certification ; RH agrégé seulement.</small>
                </div>
              </div>
              <div>
                <span class="material-symbols-outlined">history</span>
                <div>
                  <strong>Journal d’audit</strong>
                  <small>Lecture administrateur uniquement, sans contenu d’épreuve.</small>
                </div>
              </div>
            </div>
          </section>

          <section class="panel">
            <h2>Règles de rôle</h2>
            <ul class="rules">
              <li>Un employé ne voit que son propre parcours.</li>
              <li>Un superviseur voit son équipe et décide des parcours.</li>
              <li>Les RH voient des agrégats, jamais un niveau individuel.</li>
              <li>L’administrateur gère la technique, jamais le contenu pédagogique.</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .role-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 9px;
      }
      .role-card {
        display: flex;
        align-items: center;
        gap: 9px;
        padding: 10px 12px;
        border-radius: 11px;
        border: 1px solid var(--wa-border);
        background: #fff;
      }
      .role-card .material-symbols-outlined {
        width: 32px;
        height: 32px;
        border-radius: 9px;
        background: var(--wa-primary-soft);
        color: var(--wa-primary-deep);
        display: grid;
        place-items: center;
        font-size: 17px;
      }
      .role-card > div {
        flex: 1;
      }
      .role-card strong {
        display: block;
        font-size: 12px;
      }
      .role-card small {
        font-size: 10px;
        color: var(--wa-ink-soft);
      }
      .search {
        max-width: 260px;
      }
      .user {
        display: inline-flex;
        align-items: center;
        gap: 7px;
      }
      .user__initials {
        width: 24px;
        height: 24px;
        flex: none;
        border-radius: 7px;
        background: var(--wa-primary-soft);
        color: var(--wa-primary-deep);
        display: grid;
        place-items: center;
        font-size: 9.5px;
        font-weight: 700;
      }
      .domain-list {
        display: flex;
        flex-direction: column;
        gap: 7px;
      }
      .domain-list > div {
        display: flex;
        gap: 9px;
        align-items: flex-start;
        padding: 9px 11px;
        border-radius: 10px;
        background: var(--wa-surface-2);
      }
      .domain-list .material-symbols-outlined {
        color: var(--wa-primary-deep);
        font-size: 18px;
      }
      .domain-list strong {
        display: block;
        font-size: 11.5px;
      }
      .domain-list small {
        font-size: 10.5px;
        line-height: 1.4;
        color: var(--wa-ink-soft);
      }
      .rules {
        margin: 0;
        padding-left: 18px;
        font-size: 12px;
        line-height: 1.7;
        color: var(--wa-ink-soft);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HrUsersPage {
  private readonly data = inject(DataService);

  readonly roles: Role[] = ['EMPLOYEE', 'MANAGER', 'RH', 'ADMIN'];
  readonly roleLabels = ROLE_LABELS;

  readonly active = signal<'ALL' | Role>('ALL');
  readonly query = signal('');
  readonly message = signal('');
  readonly messageOk = signal(true);

  readonly created = signal<DirectoryUser[]>([]);

  readonly users = computed<DirectoryUser[]>(() => {
    const employees: DirectoryUser[] = this.data.directoryTeam.map((member) => ({
      id: member.id,
      name: member.name,
      email: member.email,
      role: member.role,
      jobTitle: member.jobTitle,
      department: member.department,
      status: member.status,
    }));
    const accounts: DirectoryUser[] = this.data.accounts().map((account) => ({
      id: account.id,
      name: account.name,
      email: account.email,
      role: account.role,
      jobTitle: account.jobTitle,
      department: account.department,
      status: 'ACTIVE' as const,
    }));
    const unique = new Map<string, DirectoryUser>();
    for (const user of [...employees, ...accounts, ...this.created()]) {
      const key = user.email.trim().toLowerCase();
      if (!unique.has(key)) {
        unique.set(key, user);
      }
    }
    return [...unique.values()];
  });

  readonly filtered = computed(() => {
    const active = this.active();
    const query = this.query().trim().toLowerCase();
    return this.users().filter((user) => {
      const inRole = active === 'ALL' || user.role === active;
      const inQuery =
        query.length === 0 ||
        `${user.name} ${user.email} ${user.department} ${user.jobTitle}`
          .toLowerCase()
          .includes(query);
      return inRole && inQuery;
    });
  });

  readonly newName = signal('');
  readonly newEmail = signal('');
  readonly newRole = signal<Role>('EMPLOYEE');
  readonly newDepartment = signal('');

  countRole(role: Role): number {
    return this.users().filter((user) => user.role === role).length;
  }

  roleIcon(role: Role): string {
    const icons: Record<Role, string> = {
      EMPLOYEE: 'person',
      MANAGER: 'supervisor_account',
      RH: 'badge',
      ADMIN: 'admin_panel_settings',
    };
    return icons[role];
  }

  initials(name: string): string {
    return name
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('');
  }

  statusLabel(status: DirectoryUser['status']): string {
    return status === 'ACTIVE' ? 'Actif' : status === 'INVITED' ? 'Invité' : 'Désactivé';
  }

  statusClass(status: DirectoryUser['status']): string {
    return status === 'ACTIVE'
      ? 'wa-chip wa-chip--success'
      : status === 'INVITED'
        ? 'wa-chip wa-chip--warning'
        : 'wa-chip wa-chip--neutral';
  }

  invite(): void {
    const name = this.newName().trim();
    const email = this.newEmail().trim();
    if (!name || !email.includes('@')) {
      this.message.set('Nom complet et adresse e-mail valide sont obligatoires.');
      this.messageOk.set(false);
      return;
    }
    if (this.users().some((user) => user.email.toLowerCase() === email.toLowerCase())) {
      this.message.set('Cette adresse figure déjà dans l’annuaire.');
      this.messageOk.set(false);
      return;
    }
    this.created.update((list) => [
      ...list,
      {
        id: `inv-${Date.now()}`,
        name,
        email,
        role: this.newRole(),
        jobTitle: 'À compléter à l’activation',
        department: this.newDepartment().trim() || 'Non précisé',
        status: 'INVITED',
      },
    ]);
    this.message.set(
      `Invitation simulée pour ${name} (${this.roleLabels[this.newRole()]}). ` +
        'Aucun accès réel n’est ouvert : l’invité devra compléter son profil.',
    );
    this.messageOk.set(true);
    this.newName.set('');
    this.newEmail.set('');
    this.newDepartment.set('');
  }
}
