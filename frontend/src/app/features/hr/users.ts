import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DataService } from '../../core/data/data.service';
import { ROLE_LABELS, Role } from '../../core/models';
import { PageHeader } from '../../shared/ui/page-header';

@Component({
  selector: 'wa-hr-users',
  imports: [MatButtonModule, PageHeader],
  template: `
    <div class="wa-page">
      <wa-page-header
        title="Utilisateurs et rôles"
        subtitle="Gestion des comptes et du contrôle d’accès basé sur les rôles (RBAC). Les permissions sont vérifiées côté backend pour chaque opération sensible."
      >
        <button mat-flat-button type="button" (click)="invite()">Inviter un collaborateur</button>
      </wa-page-header>

      <div class="wa-card">
        <table class="wa-table">
          <thead>
            <tr>
              <th>Collaborateur</th>
              <th>Rôle</th>
              <th>Poste</th>
              <th>Département</th>
              <th>Compétences</th>
              <th>État</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            @for (member of team(); track member.id) {
              <tr>
                <td>
                  <div class="who">
                    <span class="who__avatar">{{ initials(member.name) }}</span>
                    <div>
                      <div class="who__name">{{ member.name }}</div>
                      <div class="who__mail">{{ member.email }}</div>
                    </div>
                  </div>
                </td>
                <td><span class="wa-chip wa-chip--neutral">{{ roleLabels[member.role] }}</span></td>
                <td>{{ member.jobTitle }}</td>
                <td class="wa-muted">{{ member.department }}</td>
                <td>{{ member.skillsTracked }}</td>
                <td><span [class]="statusClass(member.status)">{{ statusLabel(member.status) }}</span></td>
                <td class="right">
                  <button mat-button type="button" (click)="notify(member.name)">Gérer</button>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <div class="wa-card wa-section matrix">
        <div class="wa-card__title">Matrice des permissions</div>
        <div class="wa-card__subtitle">
          Résumé du RBAC prévu au cahier des charges (§5.4).
        </div>
        <table class="wa-table">
          <thead>
            <tr>
              <th>Fonction</th>
              <th>Employé</th>
              <th>Superviseur</th>
              <th>RH</th>
              <th>Admin</th>
            </tr>
          </thead>
          <tbody>
            @for (row of matrix; track row.feature) {
              <tr>
                <td>{{ row.feature }}</td>
                <td>{{ row.employee }}</td>
                <td>{{ row.manager }}</td>
                <td>{{ row.hr }}</td>
                <td>{{ row.admin }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [
    `
      .who {
        display: flex;
        align-items: center;
        gap: 9px;
      }
      .who__avatar {
        width: 30px;
        height: 30px;
        border-radius: 50%;
        background: #eef1f8;
        color: #33405a;
        font-size: 10.5px;
        font-weight: 700;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .who__name {
        font-size: 13px;
        font-weight: 600;
      }
      .who__mail {
        font-size: 11px;
        color: var(--wa-ink-soft);
      }
      .right {
        text-align: right;
      }
      .matrix {
        margin-top: 18px;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HrUsers {
  private readonly data = inject(DataService);
  private readonly snack = inject(MatSnackBar);

  readonly team = this.data.team;
  readonly roleLabels = ROLE_LABELS;
  readonly invited = signal(0);

  readonly matrix = [
    { feature: 'Consulter son propre profil', employee: '✔', manager: '✔', hr: '✔', admin: '✔' },
    { feature: 'Consulter le profil d’un collaborateur', employee: '—', manager: '✔ (équipe)', hr: '✔', admin: '✔' },
    { feature: 'Approuver un parcours', employee: '—', manager: '✔', hr: '—', admin: '✔' },
    { feature: 'Consulter les KPI RH', employee: '—', manager: 'Partiel', hr: '✔', admin: '✔' },
    { feature: 'Gérer comptes et rôles', employee: '—', manager: '—', hr: '—', admin: '✔' },
    { feature: 'Consulter le journal d’audit', employee: '—', manager: '—', hr: 'Partiel', admin: '✔' },
  ];

  initials(name: string): string {
    return name
      .split(' ')
      .map((part) => part.charAt(0))
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  statusLabel(status: string): string {
    return status === 'ACTIVE' ? 'Actif' : status === 'INVITED' ? 'Invité' : 'Désactivé';
  }

  statusClass(status: string): string {
    return status === 'ACTIVE'
      ? 'wa-chip wa-chip--success'
      : status === 'INVITED'
        ? 'wa-chip wa-chip--warning'
        : 'wa-chip wa-chip--danger';
  }

  roleLabel(role: Role): string {
    return ROLE_LABELS[role];
  }

  invite(): void {
    this.snack.open('Invitation simulée : aucun e-mail envoyé en mode démonstration.', 'Fermer', {
      duration: 4000,
    });
  }

  notify(name: string): void {
    this.snack.open(`Gestion du compte de ${name} — écran à connecter à l’API.`, 'Fermer', {
      duration: 4000,
    });
  }
}
