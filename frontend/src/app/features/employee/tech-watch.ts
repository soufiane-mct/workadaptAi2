import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TechSignal } from '../../core/models';
import { DataService } from '../../core/data/data.service';

@Component({
  selector: 'wa-tech-watch-page',
  imports: [RouterLink],
  styleUrl: '../pages.scss',
  template: `
    <div class="page">
      <header class="page-head">
        <div>
          <h1>Veille technologique</h1>
          <p>
            L’agent de veille suit les technologies émergentes, leur maturité et leur pertinence
            pour votre métier. Un signal n’est pas un écart : il devient un écart seulement si
            vous ou votre superviseur décidez de le traiter.
          </p>
        </div>
        <div class="page-head__actions">
          <span class="wa-chip wa-chip--info">{{ signals().length }} signaux actifs</span>
          <span class="wa-chip wa-chip--warning">{{ high().length }} à forte pertinence</span>
        </div>
      </header>

      @if (message()) {
        <p class="note" [class.note--ok]="messageOk()" [class.note--danger]="!messageOk()">
          {{ message() }}
        </p>
      }

      <div class="stat-grid">
        <div class="stat">
          <span>Émergentes</span>
          <strong>{{ byMaturity().emergent }}</strong>
          <small>À surveiller, pas encore à prescrire</small>
        </div>
        <div class="stat">
          <span>En adoption</span>
          <strong>{{ byMaturity().adoption }}</strong>
          <small>Pertinence opérationnelle croissante</small>
        </div>
        <div class="stat">
          <span>Matures</span>
          <strong>{{ byMaturity().mature }}</strong>
          <small>Attendues au poste</small>
        </div>
        <div class="stat">
          <span>Signaux convertis</span>
          <strong>{{ converted() }}</strong>
          <small>Devenus des écarts à traiter</small>
        </div>
      </div>

      <div class="split">
        <section class="panel">
          <div class="toolbar" style="margin-bottom: 12px">
            <h2 style="margin: 0">Signaux de veille</h2>
            <div class="toolbar__spacer"></div>
            <div class="filters">
              @for (filter of filters; track filter.value) {
                <button
                  type="button"
                  class="filter"
                  [class.filter--on]="active() === filter.value"
                  (click)="active.set(filter.value)"
                >
                  {{ filter.label }}
                </button>
              }
            </div>
          </div>

          <div class="list">
            @for (signal of filtered(); track signal.id) {
              <article class="signal" [attr.data-maturity]="signal.maturity">
                <div class="signal__head">
                  <div>
                    <strong>{{ signal.technology }}</strong>
                    <span class="wa-small wa-muted"> · {{ signal.category }}</span>
                  </div>
                  <div class="chips">
                    <span class="wa-chip" [class]="relevanceClass(signal)">{{ relevanceLabel(signal) }}</span>
                    <span class="wa-chip wa-chip--neutral">{{ maturityLabel(signal.maturity) }}</span>
                  </div>
                </div>

                <p class="signal__why">{{ signal.why }}</p>

                <div class="signal__action">
                  <span class="material-symbols-outlined">lightbulb</span>
                  <p>{{ signal.suggestedAction }}</p>
                </div>

                <div class="signal__foot">
                  <span>Compétence : {{ signal.skillLabel }}</span>
                  <span>Source : {{ signal.source }}</span>
                  <span>{{ day(signal.at) }}</span>
                  <div class="toolbar__spacer"></div>
                  @if (hasGap(signal)) {
                    <span class="wa-chip wa-chip--neutral" title="Un écart existe déjà sur cette compétence">
                      <span class="material-symbols-outlined">check_circle</span>
                      Écart déjà créé
                    </span>
                  } @else {
                    <button class="btn btn--primary btn--small" type="button" (click)="promote(signal)">
                      <span class="material-symbols-outlined">add_task</span>
                      Transformer en écart
                    </button>
                  }
                  <button class="btn btn--ghost btn--small" type="button" (click)="dismiss(signal)">
                    Écarter
                  </button>
                </div>
              </article>
            }
            @if (filtered().length === 0) {
              <p class="empty">Aucun signal dans ce filtre.</p>
            }
          </div>
        </section>

        <div style="display: flex; flex-direction: column; gap: 18px">
          <section class="panel">
            <h2>Règle de conversion</h2>
            <p class="panel__sub" style="margin-bottom: 10px">
              La veille ne déclenche jamais une formation directement. Elle produit un signal
              sourcé, qui peut devenir un écart proposé.
            </p>
            <ol class="steps">
              <li>Un signal est détecté avec sa source et sa date.</li>
              <li>Sa pertinence est estimée pour votre poste et votre domaine.</li>
              <li>Vous décidez de le transformer en écart, ou de l’écarter.</li>
              <li>L’écart devra être confirmé par une évaluation : aucune pratique observée ne peut être inventée.</li>
            </ol>
          </section>

          <section class="panel">
            <h2>Ce que l’agent ne fait pas</h2>
            <ul class="steps">
              <li>Il ne modifie pas vos niveaux de compétence.</li>
              <li>Il ne crée pas de formation sans validation humaine.</li>
              <li>Il ne déduit pas une maîtrise d’une simple lecture d’article.</li>
            </ul>
            <a class="btn btn--small" routerLink="/app/ecarts" style="margin-top: 10px">
              <span class="material-symbols-outlined">track_changes</span>
              Voir mes écarts
            </a>
          </section>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .signal {
        padding: 14px 16px;
        border-radius: 13px;
        border: 1px solid var(--wa-border);
        background: #fff;
        border-left-width: 4px;
        border-left-color: var(--wa-ink-faint);
      }
      .signal[data-maturity='EMERGENTE'] {
        border-left-color: #7c3aed;
      }
      .signal[data-maturity='ADOPTION'] {
        border-left-color: #b26a00;
      }
      .signal[data-maturity='MATURE'] {
        border-left-color: #0f9d58;
      }
      .signal__head {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        align-items: flex-start;
        flex-wrap: wrap;
      }
      .signal__head strong {
        font-size: 14px;
      }
      .signal__why {
        margin: 9px 0;
        font-size: 12.5px;
        line-height: 1.55;
        color: var(--wa-ink-soft);
      }
      .signal__action {
        display: flex;
        gap: 8px;
        padding: 10px 12px;
        border-radius: 10px;
        background: var(--wa-surface-2);
      }
      .signal__action .material-symbols-outlined {
        font-size: 17px;
        color: #b26a00;
      }
      .signal__action p {
        margin: 0;
        font-size: 12px;
        line-height: 1.5;
      }
      .signal__foot {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 12px;
        margin-top: 10px;
        font-size: 10.5px;
        color: var(--wa-ink-faint);
      }
      .steps {
        margin: 0;
        padding-left: 18px;
        font-size: 12.5px;
        line-height: 1.7;
        color: var(--wa-ink-soft);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TechWatchPage {
  private readonly data = inject(DataService);
  private readonly service = this.data.techWatchService;

  readonly signals = this.service.signals;
  readonly high = this.service.highRelevance;
  readonly byMaturity = this.service.byMaturity;

  readonly filters: { value: 'ALL' | TechSignal['maturity']; label: string }[] = [
    { value: 'ALL', label: 'Tous' },
    { value: 'EMERGENTE', label: 'Émergentes' },
    { value: 'ADOPTION', label: 'En adoption' },
    { value: 'MATURE', label: 'Matures' },
  ];

  readonly active = signal<'ALL' | TechSignal['maturity']>('ALL');
  readonly message = signal('');
  readonly messageOk = signal(true);

  readonly filtered = computed(() => {
    const filter = this.active();
    return filter === 'ALL'
      ? this.signals()
      : this.signals().filter((signal) => signal.maturity === filter);
  });

  readonly converted = computed(
    () =>
      this.data
        .gaps()
        .filter((gap) =>
          gap.observedFacts.some((fact) => fact.source === 'TECH_WATCH'),
        ).length,
  );

  /**
   * Un écart existe déjà sur cette compétence : proposer de le transformer
   * à nouveau mènerait à un cul-de-sac. L'agent de veille refuse la
   * conversion et le signale.
   */
  hasGap(signal: TechSignal): boolean {
    return this.data.gapService.bySkill(signal.skillCode) !== undefined;
  }

  promote(signal: TechSignal): void {
    const result = this.data.promoteSignal(signal.id);
    this.message.set(result.message);
    this.messageOk.set(result.ok);
  }

  dismiss(signal: TechSignal): void {
    this.data.dismissSignal(signal.id);
    this.message.set(`Signal « ${signal.technology} » écarté. Il ne produira ni écart ni formation.`);
    this.messageOk.set(true);
  }

  relevanceLabel(signal: TechSignal): string {
    return signal.relevance === 'HAUTE'
      ? 'Pertinence haute'
      : signal.relevance === 'MOYENNE'
        ? 'Pertinence moyenne'
        : 'Pertinence faible';
  }

  relevanceClass(signal: TechSignal): string {
    return signal.relevance === 'HAUTE'
      ? 'wa-chip wa-chip--warning'
      : signal.relevance === 'MOYENNE'
        ? 'wa-chip wa-chip--info'
        : 'wa-chip wa-chip--neutral';
  }

  maturityLabel(maturity: TechSignal['maturity']): string {
    return maturity === 'EMERGENTE'
      ? 'Émergente'
      : maturity === 'ADOPTION'
        ? 'En adoption'
        : 'Mature';
  }

  day(value: string): string {
    return new Date(value).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }
}
