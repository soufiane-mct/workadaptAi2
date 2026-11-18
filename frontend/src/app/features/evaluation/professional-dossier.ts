import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import {
  DossierRequirement,
  EvaluationAnswers,
  EvaluationRecord,
  ProfessionalDossierDocument,
} from '../../core/models';

@Component({
  selector: 'wa-professional-dossier',
  template: `
    <div class="dossier">
      <header class="dossier__head">
        <div class="dossier__tab">Dossier professionnel</div>
        <div class="dossier__title">
          <strong>{{ doc().title }}</strong>
          <small>{{ doc().submissionDays }} jours de production · {{ doc().requirements.length }} exigences · entretien de vérification inclus</small>
        </div>
      </header>

      <div class="dossier__body">
        <main class="binder">
          <section class="eval-panel">
            <h2>Mandat du dossier</h2>
            <p class="eval-panel__sub">{{ doc().brief }}</p>
            <ol class="instructions">
              @for (instruction of doc().instructions; track instruction) {
                <li>{{ instruction }}</li>
              }
            </ol>
          </section>

          <section class="eval-panel">
            <div class="binder__head">
              <h2>Pièces exigées</h2>
              <span class="weight">{{ weightCovered() }} / {{ totalWeight() }} points couverts</span>
            </div>
            <p class="eval-panel__sub">
              Chaque exigence est jugée sur la pièce déposée. Une exigence obligatoire absente
              rend le dossier incomplet, quel que soit le reste.
            </p>

            @for (requirement of doc().requirements; track requirement.id; let index = $index) {
              <article class="piece" [class.piece--done]="isDone(requirement)" [class.piece--mandatory]="requirement.mandatory">
                <header class="piece__head">
                  <span class="piece__num">{{ index + 1 }}</span>
                  <div class="piece__label">
                    <strong>{{ requirement.label }}</strong>
                    <small>{{ requirement.description }}</small>
                  </div>
                  <div class="piece__meta">
                    <span class="piece__weight">{{ requirement.weight }} pts</span>
                    @if (requirement.mandatory) {
                      <span class="piece__badge">Obligatoire</span>
                    }
                  </div>
                </header>
                <textarea
                  class="wa-textarea"
                  rows="3"
                  [value]="answer(requirement.id)"
                  (input)="setAnswer(requirement.id, $any($event.target).value)"
                  [placeholder]="'Décrivez la pièce fournie pour « ' + requirement.label + ' » et où la vérifier.'"
                ></textarea>
                <span class="piece__count">{{ answer(requirement.id).trim().length }} caractères — 30 minimum</span>
              </article>
            }
          </section>

          <section class="eval-panel defense">
            <h2>Entretien de vérification</h2>
            <p class="eval-panel__sub">
              Le dossier seul ne suffit pas : ces questions vérifient que vous en êtes l’auteur
              et que vous pouvez le défendre. L’entretien pèse 15 % du score final.
            </p>
            @for (question of doc().defenseQuestions; track question.id; let index = $index) {
              <div class="defense__item">
                <label class="wa-field">
                  <span class="wa-field__label">{{ index + 1 }}. {{ question.prompt }}</span>
                  <textarea
                    class="wa-textarea"
                    rows="3"
                    [value]="answer(question.id)"
                    (input)="setAnswer(question.id, $any($event.target).value)"
                    placeholder="Justifiez vos choix, y compris ce que vous feriez différemment."
                  ></textarea>
                </label>
                <div class="themes">
                  @for (theme of question.expectedThemes; track theme) {
                    <span class="theme">{{ theme }}</span>
                  }
                </div>
              </div>
            }
          </section>

          <section class="eval-panel submit">
            <div>
              <h2>Dépôt final du dossier</h2>
              <p class="eval-panel__sub" style="margin-bottom: 0">
                {{ mandatoryDone() }} / {{ mandatoryCount() }} exigences obligatoires couvertes ·
                {{ defenseDone() }} / {{ doc().defenseQuestions.length }} réponses d’entretien.
              </p>
            </div>
            <button class="eval-btn eval-btn--primary" type="button" [disabled]="!canSubmit()" (click)="submit()">
              <span class="material-symbols-outlined">task</span>
              Déposer le dossier professionnel
            </button>
          </section>
        </main>

        <aside class="checklist">
          <p class="checklist__title">Contrôle qualité</p>
          <div class="checklist__ring">
            <strong>{{ Math.round((weightCovered() / Math.max(1, totalWeight())) * 100) }} %</strong>
            <small>du poids couvert</small>
          </div>
          @for (requirement of doc().requirements; track requirement.id) {
            <div class="check-row" [class.check-row--ok]="isDone(requirement)" [class.check-row--mandatory]="requirement.mandatory">
              <span class="material-symbols-outlined">{{ isDone(requirement) ? 'check_circle' : requirement.mandatory ? 'error' : 'radio_button_unchecked' }}</span>
              <span>{{ requirement.label }}</span>
            </div>
          }
          <p class="checklist__note">
            Le jury peut demander une pièce justificative supplémentaire : conservez les
            captures, journaux et versions.
          </p>
        </aside>
      </div>
    </div>
  `,
  styleUrl: './evaluation.scss',
  styles: [
    `
      .dossier {
        display: flex;
        flex-direction: column;
        gap: 14px;
      }
      .dossier__head {
        display: flex;
        align-items: stretch;
        gap: 0;
        border-radius: var(--wa-radius);
        overflow: hidden;
        background: #1f2937;
        color: #fff;
      }
      .dossier__tab {
        writing-mode: vertical-rl;
        transform: rotate(180deg);
        display: grid;
        place-items: center;
        padding: 12px 8px;
        background: #111827;
        font-size: 9.5px;
        text-transform: uppercase;
        letter-spacing: 0.14em;
        color: #cbd5e1;
        font-weight: 700;
      }
      .dossier__title {
        padding: 16px 20px;
      }
      .dossier__title strong {
        display: block;
        font-size: 15px;
      }
      .dossier__title small {
        font-size: 10.5px;
        color: #cbd5e1;
      }
      .dossier__body {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 280px;
        gap: 14px;
        align-items: start;
      }
      .binder {
        display: flex;
        flex-direction: column;
        gap: 14px;
      }
      .instructions {
        margin: 0;
        padding-left: 18px;
        font-size: 12.5px;
        line-height: 1.65;
      }
      .binder__head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
      }
      .weight {
        font-size: 11px;
        font-weight: 700;
        padding: 4px 10px;
        border-radius: 999px;
        background: var(--wa-primary-soft);
        color: var(--wa-primary-deep);
      }
      .piece {
        border: 1px solid var(--wa-border);
        border-radius: 11px;
        padding: 12px 13px;
        margin-bottom: 9px;
        background: var(--wa-surface-2);
      }
      .piece--done {
        background: #fff;
        border-color: #b9e6cf;
      }
      .piece--mandatory {
        border-left: 3px solid #d92d20;
      }
      .piece__head {
        display: flex;
        gap: 10px;
        align-items: flex-start;
        margin-bottom: 8px;
      }
      .piece__num {
        flex: none;
        width: 24px;
        height: 24px;
        border-radius: 6px;
        background: #e5e7eb;
        color: #374151;
        display: grid;
        place-items: center;
        font-size: 11px;
        font-weight: 700;
      }
      .piece__label {
        flex: 1;
      }
      .piece__label strong {
        display: block;
        font-size: 12.5px;
      }
      .piece__label small {
        font-size: 11px;
        color: var(--wa-ink-soft);
        line-height: 1.45;
      }
      .piece__meta {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 3px;
      }
      .piece__weight {
        font-size: 10.5px;
        font-weight: 700;
        color: var(--wa-ink-soft);
      }
      .piece__badge {
        font-size: 9px;
        font-weight: 700;
        padding: 2px 6px;
        border-radius: 999px;
        background: var(--wa-danger-soft);
        color: #a21c12;
      }
      .piece__count {
        display: block;
        margin-top: 4px;
        font-size: 10px;
        color: var(--wa-ink-faint);
      }
      .defense {
        border-top: 4px solid #1f2937;
      }
      .defense__item {
        padding: 10px 0;
        border-bottom: 1px dashed var(--wa-border);
      }
      .defense__item:last-of-type {
        border-bottom: none;
      }
      .themes {
        display: flex;
        flex-wrap: wrap;
        gap: 5px;
        margin-top: 5px;
      }
      .theme {
        font-size: 9.5px;
        padding: 3px 8px;
        border-radius: 999px;
        background: var(--wa-surface-3);
        color: var(--wa-ink-faint);
      }
      .submit {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 14px;
        flex-wrap: wrap;
      }
      .checklist {
        position: sticky;
        top: 88px;
        background: #fff;
        border: 1px solid var(--wa-border);
        border-radius: var(--wa-radius);
        padding: 16px;
        box-shadow: var(--wa-shadow-xs);
      }
      .checklist__title {
        margin: 0 0 10px;
        font-size: 10.5px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--wa-ink-faint);
        font-weight: 700;
      }
      .checklist__ring {
        text-align: center;
        padding: 14px;
        border-radius: 12px;
        background: var(--wa-surface-2);
        margin-bottom: 12px;
      }
      .checklist__ring strong {
        display: block;
        font-size: 24px;
      }
      .checklist__ring small {
        font-size: 10px;
        color: var(--wa-ink-soft);
      }
      .check-row {
        display: flex;
        gap: 7px;
        align-items: center;
        font-size: 11.5px;
        padding: 5px 0;
        color: var(--wa-ink-soft);
      }
      .check-row .material-symbols-outlined {
        font-size: 16px;
        color: var(--wa-ink-faint);
      }
      .check-row--ok .material-symbols-outlined {
        color: var(--wa-success);
      }
      .check-row--ok {
        color: var(--wa-ink);
      }
      .check-row--mandatory:not(.check-row--ok) .material-symbols-outlined {
        color: var(--wa-danger);
      }
      .checklist__note {
        margin: 12px 0 0;
        padding-top: 10px;
        border-top: 1px dashed var(--wa-border);
        font-size: 10.5px;
        line-height: 1.5;
        color: var(--wa-ink-faint);
      }
      @media (max-width: 950px) {
        .dossier__body {
          grid-template-columns: 1fr;
        }
        .checklist {
          position: static;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfessionalDossier {
  readonly record = input.required<EvaluationRecord>();
  readonly submitted = output<EvaluationAnswers>();

  readonly doc = computed(() => this.record().document as ProfessionalDossierDocument);
  private readonly answers = signal<Record<string, string>>({});
  readonly Math = Math;

  answer(id: string): string {
    return this.answers()[id] ?? '';
  }

  setAnswer(id: string, value: string): void {
    this.answers.update((map) => ({ ...map, [id]: value }));
  }

  isDone(requirement: DossierRequirement): boolean {
    return this.answer(requirement.id).trim().length >= 30;
  }

  readonly totalWeight = computed(() =>
    this.doc().requirements.reduce((sum, requirement) => sum + requirement.weight, 0),
  );

  readonly weightCovered = computed(() =>
    this.doc()
      .requirements.filter((requirement) => this.isDone(requirement))
      .reduce((sum, requirement) => sum + requirement.weight, 0),
  );

  readonly mandatoryCount = computed(
    () => this.doc().requirements.filter((requirement) => requirement.mandatory).length,
  );

  readonly mandatoryDone = computed(
    () =>
      this.doc().requirements.filter((requirement) => requirement.mandatory && this.isDone(requirement))
        .length,
  );

  readonly defenseDone = computed(
    () =>
      this.doc().defenseQuestions.filter((question) => this.answer(question.id).trim().length >= 40)
        .length,
  );

  canSubmit(): boolean {
    return (
      this.mandatoryDone() === this.mandatoryCount() &&
      this.defenseDone() === this.doc().defenseQuestions.length
    );
  }

  submit(): void {
    if (!this.canSubmit()) {
      return;
    }
    const answers: EvaluationAnswers = {};
    for (const requirement of this.doc().requirements) {
      answers[requirement.id] = this.answer(requirement.id);
    }
    for (const question of this.doc().defenseQuestions) {
      answers[question.id] = this.answer(question.id);
    }
    this.submitted.emit(answers);
  }
}
