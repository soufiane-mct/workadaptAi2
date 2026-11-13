import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../../core/auth/auth.service';
import { ROLE_LABELS } from '../../core/models';

@Component({
  selector: 'wa-access-denied',
  imports: [RouterLink, MatButtonModule],
  template: `
    <div class="wa-page">
      <div class="wa-card denied">
        <span class="material-symbols-outlined denied__icon">lock</span>
        <h1>Accès refusé</h1>
        <p>
          Votre rôle actuel ({{ roleLabel() }}) ne permet pas d’ouvrir cette page. Cette restriction
          est appliquée par le contrôle d’accès basé sur les rôles (RBAC). Le backend vérifiera de
          la même manière chaque opération sensible.
        </p>

        <div class="denied__actions">
          <a mat-flat-button routerLink="/app/tableau-de-bord">Retour au tableau de bord</a>
          <a mat-stroked-button routerLink="/login">Changer de profil</a>
        </div>

        <div class="denied__matrix">
          <div class="denied__matrix-title">Rôles ayant accès</div>
          <p>
            Les pages de pilotage sont réservées au superviseur, aux RH et à l’administrateur. La
            gestion des comptes, le journal d’audit et le Control Center sont réservés à
            l’administrateur.
          </p>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .denied {
        max-width: 640px;
        margin: 48px auto;
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
        padding: 34px 30px;
      }
      .denied__icon {
        font-size: 40px;
        color: var(--wa-danger);
        background: var(--wa-danger-soft);
        border-radius: 50%;
        padding: 14px;
      }
      h1 {
        font-size: 21px;
        font-weight: 600;
        margin: 4px 0 0;
      }
      p {
        margin: 0;
        font-size: 13.5px;
        line-height: 1.6;
        color: var(--wa-ink-soft);
      }
      .denied__actions {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
        justify-content: center;
        margin-top: 8px;
      }
      .denied__matrix {
        margin-top: 14px;
        padding-top: 16px;
        border-top: 1px dashed var(--wa-border);
        text-align: left;
      }
      .denied__matrix-title {
        font-size: 12px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: var(--wa-ink-soft);
        margin-bottom: 4px;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccessDenied {
  private readonly auth = inject(AuthService);

  readonly roleLabel = computed(() => {
    const role = this.auth.role();
    return role ? ROLE_LABELS[role] : 'inconnu';
  });
}
