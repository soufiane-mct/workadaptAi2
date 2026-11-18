import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'wa-access-denied',
  imports: [RouterLink],
  template: `
    <div class="denied">
      <span class="material-symbols-outlined">lock</span>
      <h1>Accès refusé</h1>
      <p>
        Votre rôle ne permet pas d’ouvrir cette page. Les espaces WorkAdapt sont séparés :
        un employé ne voit jamais les écrans de pilotage, et les RH ne voient jamais de
        donnée nominative individuelle.
      </p>
      <a class="wa-chip wa-chip--info" routerLink="/app/tableau-de-bord">
        Revenir à mon tableau de bord
      </a>
    </div>
  `,
  styles: [
    `
      .denied {
        max-width: 520px;
        margin: 10vh auto;
        text-align: center;
        background: #fff;
        border: 1px solid var(--wa-border);
        border-radius: var(--wa-radius-lg);
        box-shadow: var(--wa-shadow);
        padding: 40px 32px;
      }
      .material-symbols-outlined {
        font-size: 44px;
        color: var(--wa-danger);
      }
      h1 {
        margin: 10px 0 8px;
        font-size: 22px;
      }
      p {
        color: var(--wa-ink-soft);
        font-size: 13.5px;
        line-height: 1.6;
        margin: 0 0 18px;
      }
      a {
        text-decoration: none;
        padding: 8px 14px;
      }
    `,
  ],
})
export class AccessDenied {}
