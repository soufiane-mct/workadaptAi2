import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import {
  DrillSet,
  ExamQuestion,
  InteractiveProgram,
  StepEvidence,
} from '../../core/models';
import { StepVerdict } from './step-verdict';
import { WorkspaceBase } from './workspace-base';

@Component({
  selector: 'wa-interactive-workspace',
  imports: [StepVerdict],
  template: `
    <div class="ws-body">
      <aside class="ws-panel">
        <h2>Decks de drills</h2>
        <p class="ws-panel__sub">Répétition espacée · seuil {{ deck()?.masteryThreshold ?? 80 }} %</p>
        <div class="ws-list">
          @for (unit of units(); track unit.id; let index = $index) {
            <button
              type="button"
              class="ws-unit"
              [class.ws-unit--active]="activeUnit()?.id === unit.id"
              [class.ws-unit--done]="isDone(unit.id)"
              [class.ws-unit--locked]="isLocked(unit.id)"
              (click)="openDeck(unit.id)"
            >
              <span class="ws-unit__index">{{ isDone(unit.id) ? '✓' : index + 1 }}</span>
              <span class="ws-unit__title">
                {{ unit.title }}
                <span class="ws-unit__kind">{{ unit.minutes }} min · cartes + drills</span>
              </span>
              <span class="ring" [style.--p]="masteryFor(unit.id)">{{ masteryFor(unit.id) }}</span>
            </button>
          }
        </div>
        <p class="ws-panel__sub" style="margin: 14px 0 0">
          Les notions échouées reviennent à J+1, J+3 et J+7. Le deck n’est validé qu’au-dessus
          du seuil.
        </p>
      </aside>

      @if (deck(); as current) {
        <main class="ws-main">
          <section class="ws-panel deck-head">
            <div>
              <span class="ws-tag">Deck {{ current.order }} · {{ current.notion }}</span>
              <h2 style="margin-top: 8px">{{ current.title }}</h2>
              <p class="ws-panel__sub" style="margin-bottom: 0">
                Cartes de révision, drills corrigés immédiatement, puis défi mélangé.
              </p>
            </div>
            <div class="mastery">
              <strong>{{ mastery() }} %</strong>
              <small>maîtrise</small>
            </div>
          </section>

          <div class="segmented">
            <button type="button" [class.on]="mode() === 'cards'" (click)="mode.set('cards')">
              Cartes ({{ current.cards.length }})
            </button>
            <button type="button" [class.on]="mode() === 'drills'" (click)="mode.set('drills')">
              Drills ({{ current.drills.length }})
            </button>
            <button type="button" [class.on]="mode() === 'challenge'" (click)="mode.set('challenge')">
              Défi final
            </button>
          </div>

          @if (mode() === 'cards') {
            @if (current.cards[cardIndex()]; as card) {
              <button type="button" class="flash" (click)="flipCard()">
                <span class="flash__side">{{ flipped() ? 'Réponse' : 'Question' }}</span>
                <strong>{{ flipped() ? card.back : card.front }}</strong>
                <small>{{ flipped() ? 'Cliquez pour revoir la question' : 'Cliquez pour révéler' }}</small>
              </button>
              <div class="ws-actions">
                <button class="btn" type="button" [disabled]="cardIndex() === 0" (click)="moveCard(-1)">Précédente</button>
                <button class="btn" type="button" [disabled]="cardIndex() >= current.cards.length - 1" (click)="moveCard(1)">Suivante</button>
                <span class="wa-small wa-muted">Carte {{ cardIndex() + 1 }} / {{ current.cards.length }}</span>
              </div>
            }
          }

          @if (mode() === 'drills') {
            @for (question of current.drills; track question.id; let index = $index) {
              <section class="ws-panel drill">
                <div class="drill__head">
                  <span class="stamp">{{ index + 1 }}</span>
                  <p>{{ question.prompt }}</p>
                  @if (revealed()[question.id]) {
                    <span class="verdict" [class.verdict--ok]="isCorrect(question)">
                      {{ isCorrect(question) ? 'Correct' : 'À revoir' }}
                    </span>
                  }
                </div>
                <div class="options">
                  @for (option of question.options; track option; let optionIndex = $index) {
                    <button
                      type="button"
                      class="option"
                      [class.option--picked]="picked(question.id).includes(optionIndex)"
                      [class.option--right]="revealed()[question.id] && question.correctIndexes.includes(optionIndex)"
                      [class.option--wrong]="revealed()[question.id] && picked(question.id).includes(optionIndex) && !question.correctIndexes.includes(optionIndex)"
                      [disabled]="!editable() || revealed()[question.id]"
                      (click)="toggleOption(question, optionIndex)"
                    >
                      <span class="option__mark">{{ letter(optionIndex) }}</span>
                      {{ option }}
                    </button>
                  }
                </div>
                @if (revealed()[question.id]) {
                  <p class="wa-small wa-muted" style="margin: 8px 0 0">{{ question.explanation }}</p>
                } @else {
                  <button
                    class="btn"
                    type="button"
                    [disabled]="picked(question.id).length === 0"
                    (click)="reveal(question.id)"
                  >
                    Vérifier
                  </button>
                }
              </section>
            }
            <section class="ws-panel">
              <h2>Validation du deck</h2>
              <p class="ws-panel__sub">
                Seuil {{ current.masteryThreshold }} %. Répondez à tous les drills pour calculer
                la maîtrise réelle.
              </p>
              <div class="ws-actions">
                <button
                  class="btn btn--primary"
                  type="button"
                  [disabled]="!editable() || isDone(current.id) || answered() < current.drills.length || mastery() < current.masteryThreshold"
                  (click)="finish(current.id)"
                >
                  <span class="material-symbols-outlined">fact_check</span>
                  {{ isDone(current.id) ? 'Deck validé' : 'Faire vérifier par l’agent' }}
                </button>
                <span class="wa-small wa-muted">{{ answered() }} / {{ current.drills.length }} drills vérifiés</span>
              </div>
              <wa-step-verdict [verification]="verification()" />
            </section>
          }

          @if (mode() === 'challenge') {
            <section class="ws-panel challenge">
              <span class="ws-tag">Série mélangée</span>
              <h2 style="margin-top: 8px">{{ mm().finalChallenge.title }}</h2>
              <ul class="keypoints">
                @for (rule of mm().finalChallenge.rules; track rule) {
                  <li>{{ rule }}</li>
                }
              </ul>
              <p class="ws-small wa-muted">
                Ce défi se débloque quand tous les decks sont validés. Il fait partie de la
                preuve de fin, pas de l’évaluation finale.
              </p>
            </section>
          }
        </main>
      }
    </div>
  `,
  styleUrl: './workspace.scss',
  styles: [
    `
      .deck-head {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 16px;
      }
      .mastery {
        text-align: center;
        padding: 10px 16px;
        border-radius: 12px;
        background: var(--wa-violet-soft);
        color: #5b21b6;
      }
      .mastery strong {
        display: block;
        font-size: 22px;
      }
      .mastery small {
        font-size: 10.5px;
        text-transform: uppercase;
        letter-spacing: 0.06em;
      }
      .segmented {
        display: flex;
        gap: 6px;
        padding: 5px;
        border-radius: 12px;
        background: var(--wa-surface-3);
      }
      .segmented button {
        flex: 1;
        border: none;
        background: transparent;
        padding: 8px;
        border-radius: 9px;
        font-size: 12px;
        font-weight: 600;
        color: var(--wa-ink-soft);
        cursor: pointer;
      }
      .segmented button.on {
        background: #fff;
        color: var(--wa-violet);
        box-shadow: var(--wa-shadow-xs);
      }
      .flash {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 8px;
        min-height: 190px;
        padding: 26px;
        border-radius: var(--wa-radius);
        border: 1px solid var(--wa-border);
        background: linear-gradient(160deg, #faf8ff, #f1ecff);
        cursor: pointer;
      }
      .flash__side {
        font-size: 10.5px;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        color: var(--wa-violet);
        font-weight: 700;
      }
      .flash strong {
        font-size: 19px;
        text-align: center;
        max-width: 44ch;
        line-height: 1.4;
      }
      .flash small {
        color: var(--wa-ink-soft);
        font-size: 11.5px;
      }
      .drill__head {
        display: flex;
        gap: 10px;
        align-items: flex-start;
      }
      .drill__head p {
        flex: 1;
        margin: 0;
        font-size: 13.5px;
        font-weight: 600;
        line-height: 1.5;
      }
      .stamp {
        width: 24px;
        height: 24px;
        flex: none;
        border-radius: 7px;
        background: var(--wa-violet-soft);
        color: #5b21b6;
        display: grid;
        place-items: center;
        font-size: 11px;
        font-weight: 700;
      }
      .verdict {
        font-size: 10.5px;
        font-weight: 700;
        padding: 3px 8px;
        border-radius: 999px;
        background: var(--wa-danger-soft);
        color: #a21c12;
      }
      .verdict--ok {
        background: var(--wa-success-soft);
        color: #0a6b3d;
      }
      .options {
        display: grid;
        gap: 7px;
        margin: 12px 0;
      }
      .option {
        display: flex;
        align-items: center;
        gap: 9px;
        text-align: left;
        padding: 9px 11px;
        border-radius: 10px;
        border: 1px solid var(--wa-border);
        background: #fff;
        font-size: 12.5px;
        cursor: pointer;
      }
      .option__mark {
        width: 22px;
        height: 22px;
        flex: none;
        border-radius: 6px;
        background: var(--wa-surface-3);
        display: grid;
        place-items: center;
        font-size: 10.5px;
        font-weight: 700;
      }
      .option--picked {
        border-color: var(--wa-violet);
        background: var(--wa-violet-soft);
      }
      .option--right {
        border-color: var(--wa-success);
        background: var(--wa-success-soft);
      }
      .option--wrong {
        border-color: var(--wa-danger);
        background: var(--wa-danger-soft);
      }
      .ring {
        --p: 0;
        width: 34px;
        height: 34px;
        flex: none;
        border-radius: 50%;
        display: grid;
        place-items: center;
        font-size: 9.5px;
        font-weight: 700;
        color: #5b21b6;
        background: conic-gradient(var(--wa-violet) calc(var(--p) * 1%), #ece8f8 0);
      }
      .keypoints {
        margin: 0 0 10px;
        padding-left: 18px;
        font-size: 13px;
        line-height: 1.7;
      }
      .ws-small {
        font-size: 12px;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InteractiveWorkspace extends WorkspaceBase {
  readonly mm = computed(() => this.program() as InteractiveProgram);
  readonly deck = computed(() =>
    this.mm().drillSets.find((item) => item.id === this.activeUnit()?.id),
  );

  readonly mode = signal<'cards' | 'drills' | 'challenge'>('cards');
  readonly cardIndex = signal(0);
  readonly flipped = signal(false);
  readonly pickedMap = signal<Record<string, number[]>>({});
  readonly revealed = signal<Record<string, boolean>>({});
  /** Cartes effectivement retournées, par deck. */
  readonly flippedCards = signal<Record<string, number[]>>({});

  readonly answered = computed(
    () => this.deck()?.drills.filter((question) => this.revealed()[question.id]).length ?? 0,
  );

  readonly mastery = computed(() => {
    const drills = this.deck()?.drills ?? [];
    if (drills.length === 0) {
      return 0;
    }
    return Math.round((drills.filter((question) => this.isCorrect(question)).length / drills.length) * 100);
  });

  openDeck(unitId: string): void {
    this.select(unitId);
    this.mode.set('cards');
    this.cardIndex.set(0);
    this.flipped.set(false);
    this.pickedMap.set({});
    this.revealed.set({});
  }

  /**
   * Retourne la carte courante. Une carte retournée est tracée : c'est la
   * trace du travail réel, une carte non consultée ne peut pas être
   * déclarée réalisée.
   */
  flipCard(): void {
    const deck = this.deck();
    if (!deck) {
      return;
    }
    const index = this.cardIndex();
    this.flipped.update((value) => !value);
    this.flippedCards.update((map) => {
      const done = map[deck.id] ?? [];
      return done.includes(index) ? map : { ...map, [deck.id]: [...done, index] };
    });
  }

  /** Une carte n'est « consultée » que si elle a été retournée au moins une fois. */
  cardConsulted(index: number): boolean {
    const deck = this.deck();
    return deck ? (this.flippedCards()[deck.id] ?? []).includes(index) : false;
  }

  moveCard(delta: number): void {
    this.cardIndex.update((index) =>
      Math.max(0, Math.min((this.deck()?.cards.length ?? 1) - 1, index + delta)),
    );
    this.flipped.set(false);
  }

  picked(questionId: string): number[] {
    return this.pickedMap()[questionId] ?? [];
  }

  toggleOption(question: ExamQuestion, index: number): void {
    const current = this.picked(question.id);
    const multi = question.type === 'MULTI';
    const next = multi
      ? current.includes(index)
        ? current.filter((value) => value !== index)
        : [...current, index]
      : [index];
    this.pickedMap.update((map) => ({ ...map, [question.id]: next }));
  }

  reveal(questionId: string): void {
    this.revealed.update((map) => ({ ...map, [questionId]: true }));
  }

  isCorrect(question: ExamQuestion): boolean {
    const picked = this.picked(question.id);
    return (
      picked.length === question.correctIndexes.length &&
      picked.every((value) => question.correctIndexes.includes(value))
    );
  }

  masteryFor(unitId: string): number {
    return this.isDone(unitId) ? 100 : this.activeUnit()?.id === unitId ? this.mastery() : 0;
  }

  letter(index: number): string {
    return String.fromCharCode(65 + index);
  }

  /**
   * Le deck n’est terminé que si l’agent valide la trace : réponses, maîtrise
   * réelle et synthèse écrite de ce qui a été compris.
   */
  finish(deckId: string): void {
    const deck = this.deck();
    if (!deck) {
      return;
    }
    const drills = deck.drills;
    const evidence: StepEvidence = {
      unitId: deckId,
      format: 'INTERACTIVE',
      kind: 'QUIZ',
      steps: deck.cards.map((card, index) => ({
        label: `Carte : ${card.front}`,
        done: this.cardConsulted(index),
      })),
      criteria: drills.map((question) => ({
        label: question.prompt,
        done: this.revealed()[question.id] === true,
        detail: `Réponse : ${this.picked(question.id)
          .map((index) => question.options[index] ?? '')
          .join(' | ')} — corrigé : ${this.isCorrect(question) ? 'oui' : 'non'}`,
      })),
      narrative: `Drills vérifiés : ${this.answered()}/${drills.length}. Maîtrise calculée : ${this.mastery()} % (seuil ${deck.masteryThreshold} %). Notions du deck : ${deck.notion}.`,
      durationMinutes: this.minutesOn(deckId),
      expectedMinutes: deck.estimatedMinutes,
    };

    const verification = this.verifyStep({
      unitId: deckId,
      unitTitle: deck.title,
      format: 'INTERACTIVE',
      notions: [deck.notion, deck.title],
      evidence,
    });

    this.completeValidated(deckId, deck.estimatedMinutes, verification);
  }

  deckSet(): DrillSet | undefined {
    return this.deck();
  }
}
