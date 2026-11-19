import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { StepVerification } from '../../core/models';

/**
 * Verdict de l'agent d'analyse des preuves.
 *
 * L'employé voit exactement ce qui a été contrôlé, ce qui manque et ce que
 * l'agent a reçu comme données. Rien n'est opaque.
 */
@Component({
  selector: 'wa-step-verdict',
  template: `
    @if (verification(); as verdict) {
      <section
        class="verdict"
        [class.verdict--ok]="verdict.verdict === 'VALIDE'"
        [class.verdict--todo]="verdict.verdict === 'INCOMPLET'"
        [class.verdict--ko]="verdict.verdict === 'REJETE'"
      >
        <header class="verdict__head">
          <span class="material-symbols-outlined">
            {{ verdict.verdict === 'VALIDE' ? 'verified' : verdict.verdict === 'INCOMPLET' ? 'pending' : 'gpp_bad' }}
          </span>
          <div>
            <strong>{{ titleFor(verdict) }}</strong>
            <small>{{ verdict.agent }} · score de preuve {{ verdict.score }}/100 · confiance {{ confidence(verdict) }}</small>
          </div>
        </header>

        <p class="verdict__feedback">{{ verdict.feedback }}</p>

        @if (verdict.checked.length > 0) {
          <div class="verdict__block">
            <span class="verdict__label">Contrôlé</span>
            <ul>
              @for (item of verdict.checked; track item) {
                <li>{{ item }}</li>
              }
            </ul>
          </div>
        }

        @if (verdict.gaps.length > 0) {
          <div class="verdict__block verdict__block--gap">
            <span class="verdict__label">À corriger</span>
            <ul>
              @for (item of verdict.gaps; track item) {
                <li>{{ item }}</li>
              }
            </ul>
          </div>
        }

        <details class="verdict__trace">
          <summary>Données transmises à l’agent ({{ verdict.reviewed.length }})</summary>
          <ul>
            @for (item of verdict.reviewed; track item) {
              <li>{{ item }}</li>
            }
          </ul>
        </details>
      </section>
    }
  `,
  styles: [
    `
      .verdict {
        margin-top: 14px;
        padding: 14px 16px;
        border-radius: 14px;
        border: 1px solid var(--wa-border);
        background: var(--wa-surface-2);
        border-left: 4px solid var(--wa-border);
      }
      .verdict--ok {
        border-left-color: var(--wa-success);
        background: var(--wa-success-soft);
      }
      .verdict--todo {
        border-left-color: var(--wa-warning);
        background: var(--wa-warning-soft);
      }
      .verdict--ko {
        border-left-color: var(--wa-danger);
        background: var(--wa-danger-soft);
      }
      .verdict__head {
        display: flex;
        gap: 10px;
        align-items: flex-start;
      }
      .verdict__head .material-symbols-outlined {
        font-size: 22px;
      }
      .verdict__head strong {
        display: block;
        font-size: 13px;
      }
      .verdict__head small {
        display: block;
        font-size: 10.5px;
        color: var(--wa-ink-faint);
        margin-top: 2px;
      }
      .verdict__feedback {
        margin: 10px 0 0;
        font-size: 12.5px;
        line-height: 1.55;
        color: var(--wa-ink-soft);
      }
      .verdict__block {
        margin-top: 10px;
      }
      .verdict__label {
        display: block;
        font-size: 9.5px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        font-weight: 700;
        color: var(--wa-ink-faint);
        margin-bottom: 4px;
      }
      .verdict__block ul,
      .verdict__trace ul {
        margin: 0;
        padding-left: 17px;
        font-size: 12px;
        line-height: 1.6;
        color: var(--wa-ink-soft);
      }
      .verdict__block--gap li {
        color: var(--wa-ink);
      }
      .verdict__trace {
        margin-top: 10px;
        font-size: 11.5px;
      }
      .verdict__trace summary {
        cursor: pointer;
        color: var(--wa-primary-deep);
        font-weight: 600;
      }
      .verdict__trace ul {
        margin-top: 6px;
        max-height: 190px;
        overflow: auto;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StepVerdict {
  readonly verification = input.required<StepVerification | undefined>();

  titleFor(verdict: StepVerification): string {
    if (verdict.verdict === 'VALIDE') {
      return 'Preuve vérifiée — étape validée';
    }
    if (verdict.verdict === 'INCOMPLET') {
      return 'Preuve incomplète — étape à compléter';
    }
    return 'Preuve refusée — étape à reprendre';
  }

  confidence(verdict: StepVerification): string {
    return `${Math.round(verdict.confidence * 100)} %`;
  }
}
