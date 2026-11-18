import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import {
  EvaluationAnswers,
  EvaluationRecord,
  ExamQuestion,
  KnowledgeTestDocument,
} from '../../core/models';

@Component({
  selector: 'wa-knowledge-test',
  template: `
    <div class="exam">
      <header class="exam__bar">
        <div class="exam__title">
          <span class="material-symbols-outlined">quiz</span>
          <div>
            <strong>{{ doc().title }}</strong>
            <small>{{ doc().sections.length }} sections · {{ questionCount() }} questions</small>
          </div>
        </div>
        <div class="exam__clock">
          <span class="material-symbols-outlined">timer</span>
          {{ doc().durationMinutes }} min
        </div>
      </header>

      <div class="exam__body">
        <aside class="sheet">
          <p class="sheet__title">Feuille de réponses</p>
          @for (section of doc().sections; track section.id) {
            <div class="sheet__section">
              <span class="sheet__label">{{ section.title }}</span>
              <div class="sheet__grid">
                @for (question of section.questions; track question.id; let index = $index) {
                  <button
                    type="button"
                    class="sheet__cell"
                    [class.sheet__cell--done]="isAnswered(question)"
                    [class.sheet__cell--active]="focus() === question.id"
                    (click)="focus.set(question.id)"
                    [attr.aria-label]="'Question ' + (index + 1)"
                  >
                    {{ index + 1 }}
                  </button>
                }
              </div>
            </div>
          }
          <div class="sheet__progress">
            <strong>{{ answeredCount() }} / {{ questionCount() }}</strong>
            <small>réponses complètes</small>
          </div>
        </aside>

        <main class="paper">
          <ol class="instructions">
            @for (instruction of doc().instructions; track instruction) {
              <li>{{ instruction }}</li>
            }
          </ol>

          @for (section of doc().sections; track section.id; let sIndex = $index) {
            <section class="section">
              <header class="section__head">
                <span class="section__num">{{ sIndex + 1 }}</span>
                <div>
                  <h3>{{ section.title }}</h3>
                  <p>{{ section.objective }}</p>
                </div>
              </header>

              @for (question of section.questions; track question.id; let qIndex = $index) {
                <article
                  class="question"
                  [class.question--critical]="question.critical"
                  [class.question--focus]="focus() === question.id"
                >
                  <div class="question__head">
                    <span class="question__num">{{ sIndex + 1 }}.{{ qIndex + 1 }}</span>
                    <span class="question__type">{{ typeLabel(question.type) }}</span>
                    <span class="question__points">{{ question.points }} pts</span>
                    @if (question.critical) {
                      <span class="question__critical">Éliminatoire</span>
                    }
                  </div>
                  <p class="question__prompt">{{ question.prompt }}</p>

                  @if (question.type === 'OPEN' || question.type === 'TECHNICAL') {
                    <textarea
                      class="wa-textarea"
                      rows="4"
                      [value]="text(question.id)"
                      (input)="setText(question.id, $any($event.target).value)"
                      placeholder="Réponse argumentée. Le correcteur vérifie les notions clés, pas la formulation."
                    ></textarea>
                    <span class="question__count">{{ text(question.id).trim().length }} caractères</span>
                  } @else {
                    <div class="answers">
                      @for (option of question.options; track option; let oIndex = $index) {
                        <button
                          type="button"
                          class="answer"
                          [class.answer--on]="isPicked(question, oIndex)"
                          (click)="pick(question, oIndex)"
                        >
                          <span class="answer__mark">
                            {{ question.type === 'MULTI' ? (isPicked(question, oIndex) ? '✓' : '') : letter(oIndex) }}
                          </span>
                          {{ option }}
                        </button>
                      }
                    </div>
                    @if (question.type === 'MULTI') {
                      <span class="question__hint">Plusieurs réponses possibles. Une erreur annule une bonne réponse.</span>
                    }
                  }
                </article>
              }
            </section>
          }

          <footer class="submit">
            @if (missingCount() > 0) {
              <p class="eval-note">
                {{ missingCount() }} question(s) incomplète(s). Une réponse ouverte doit contenir
                au moins 40 caractères pour être corrigée.
              </p>
            }
            <div class="eval-actions">
              <button class="eval-btn eval-btn--primary" type="button" [disabled]="missingCount() > 0" (click)="submit()">
                <span class="material-symbols-outlined">fact_check</span>
                Remettre la copie
              </button>
              <span class="eval-kv" style="padding: 6px 10px">
                <strong>{{ answeredCount() }} / {{ questionCount() }} complètes</strong>
              </span>
            </div>
          </footer>
        </main>
      </div>
    </div>
  `,
  styleUrl: './evaluation.scss',
  styles: [
    `
      .exam {
        display: flex;
        flex-direction: column;
        gap: 14px;
      }
      .exam__bar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 14px;
        padding: 14px 18px;
        border-radius: var(--wa-radius);
        background: #101a33;
        color: #fff;
      }
      .exam__title {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .exam__title small {
        display: block;
        font-size: 10.5px;
        color: #9fb0d6;
      }
      .exam__clock {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 12px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.12);
        font-size: 12px;
        font-weight: 600;
      }
      .exam__body {
        display: grid;
        grid-template-columns: 240px minmax(0, 1fr);
        gap: 14px;
        align-items: start;
      }
      .sheet {
        position: sticky;
        top: 88px;
        background: #fff;
        border: 1px solid var(--wa-border);
        border-radius: var(--wa-radius);
        padding: 16px;
        box-shadow: var(--wa-shadow-xs);
      }
      .sheet__title {
        margin: 0 0 12px;
        font-size: 10.5px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--wa-ink-faint);
        font-weight: 700;
      }
      .sheet__section {
        margin-bottom: 12px;
      }
      .sheet__label {
        display: block;
        font-size: 11px;
        font-weight: 600;
        margin-bottom: 6px;
        color: var(--wa-ink-soft);
      }
      .sheet__grid {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
      }
      .sheet__cell {
        width: 28px;
        height: 28px;
        border-radius: 7px;
        border: 1px solid var(--wa-border);
        background: #fff;
        font-size: 11px;
        font-weight: 600;
        color: var(--wa-ink-soft);
        cursor: pointer;
      }
      .sheet__cell--done {
        background: #eef2ff;
        border-color: #b9c6ff;
        color: var(--wa-primary-deep);
      }
      .sheet__cell--active {
        box-shadow: 0 0 0 2px rgba(47, 84, 235, 0.35);
      }
      .sheet__progress {
        border-top: 1px dashed var(--wa-border);
        padding-top: 10px;
      }
      .sheet__progress strong {
        display: block;
        font-size: 17px;
      }
      .sheet__progress small {
        font-size: 10.5px;
        color: var(--wa-ink-soft);
      }
      .paper {
        background: #fff;
        border: 1px solid var(--wa-border);
        border-radius: var(--wa-radius);
        padding: 22px;
        box-shadow: var(--wa-shadow-xs);
      }
      .instructions {
        margin: 0 0 18px;
        padding: 12px 14px 12px 32px;
        border-radius: 10px;
        background: var(--wa-surface-2);
        font-size: 11.5px;
        line-height: 1.6;
        color: var(--wa-ink-soft);
      }
      .section {
        margin-bottom: 20px;
      }
      .section__head {
        display: flex;
        gap: 10px;
        align-items: flex-start;
        padding-bottom: 8px;
        border-bottom: 2px solid var(--wa-ink);
        margin-bottom: 10px;
      }
      .section__head h3 {
        margin: 0;
        font-size: 14.5px;
      }
      .section__head p {
        margin: 2px 0 0;
        font-size: 11.5px;
        color: var(--wa-ink-soft);
      }
      .section__num {
        flex: none;
        width: 26px;
        height: 26px;
        border-radius: 7px;
        background: var(--wa-ink);
        color: #fff;
        display: grid;
        place-items: center;
        font-size: 12px;
        font-weight: 700;
      }
      .question {
        padding: 12px 0 14px;
        border-bottom: 1px dashed var(--wa-border);
      }
      .question--focus {
        background: #f8faff;
        margin: 0 -8px;
        padding: 12px 8px;
        border-radius: 10px;
      }
      .question--critical .question__prompt {
        border-left: 3px solid var(--wa-danger);
        padding-left: 9px;
      }
      .question__head {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 6px;
        flex-wrap: wrap;
      }
      .question__num {
        font-size: 11.5px;
        font-weight: 700;
        color: var(--wa-primary-deep);
      }
      .question__type {
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: var(--wa-ink-faint);
        font-weight: 700;
      }
      .question__points {
        font-size: 10.5px;
        color: var(--wa-ink-soft);
      }
      .question__critical {
        font-size: 10px;
        font-weight: 700;
        padding: 2px 7px;
        border-radius: 999px;
        background: var(--wa-danger-soft);
        color: #a21c12;
      }
      .question__prompt {
        margin: 0 0 9px;
        font-size: 13px;
        line-height: 1.55;
      }
      .question__count,
      .question__hint {
        display: block;
        margin-top: 4px;
        font-size: 10.5px;
        color: var(--wa-ink-faint);
      }
      .answers {
        display: grid;
        gap: 6px;
      }
      .answer {
        display: flex;
        align-items: flex-start;
        gap: 9px;
        text-align: left;
        padding: 8px 11px;
        border-radius: 9px;
        border: 1px solid var(--wa-border);
        background: #fff;
        font-size: 12.5px;
        cursor: pointer;
      }
      .answer__mark {
        flex: none;
        width: 21px;
        height: 21px;
        border-radius: 50%;
        background: var(--wa-surface-3);
        display: grid;
        place-items: center;
        font-size: 10px;
        font-weight: 700;
      }
      .answer--on {
        border-color: var(--wa-primary);
        background: var(--wa-primary-soft);
      }
      .answer--on .answer__mark {
        background: var(--wa-primary);
        color: #fff;
      }
      .submit {
        border-top: 2px solid var(--wa-border);
        padding-top: 14px;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      @media (max-width: 900px) {
        .exam__body {
          grid-template-columns: 1fr;
        }
        .sheet {
          position: static;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KnowledgeTest {
  readonly record = input.required<EvaluationRecord>();
  readonly submitted = output<EvaluationAnswers>();

  readonly doc = computed(() => this.record().document as KnowledgeTestDocument);
  readonly focus = signal('');

  private readonly picks = signal<Record<string, number[]>>({});
  private readonly texts = signal<Record<string, string>>({});

  readonly questionCount = computed(() =>
    this.doc().sections.reduce((sum, section) => sum + section.questions.length, 0),
  );

  readonly answeredCount = computed(
    () =>
      this.doc().sections
        .flatMap((section) => section.questions)
        .filter((question) => this.isAnswered(question)).length,
  );

  readonly missingCount = computed(() => this.questionCount() - this.answeredCount());

  text(questionId: string): string {
    return this.texts()[questionId] ?? '';
  }

  setText(questionId: string, value: string): void {
    this.texts.update((map) => ({ ...map, [questionId]: value }));
  }

  isPicked(question: ExamQuestion, index: number): boolean {
    return (this.picks()[question.id] ?? []).includes(index);
  }

  pick(question: ExamQuestion, index: number): void {
    this.picks.update((map) => {
      const current = map[question.id] ?? [];
      if (question.type === 'MULTI') {
        return {
          ...map,
          [question.id]: current.includes(index)
            ? current.filter((value) => value !== index)
            : [...current, index],
        };
      }
      return { ...map, [question.id]: [index] };
    });
  }

  isAnswered(question: ExamQuestion): boolean {
    if (question.type === 'OPEN' || question.type === 'TECHNICAL') {
      return this.text(question.id).trim().length >= 40;
    }
    return (this.picks()[question.id] ?? []).length > 0;
  }

  letter(index: number): string {
    return String.fromCharCode(65 + index);
  }

  typeLabel(type: ExamQuestion['type']): string {
    switch (type) {
      case 'QCM':
        return 'QCM';
      case 'MULTI':
        return 'Réponses multiples';
      case 'TRUE_FALSE':
        return 'Vrai / Faux';
      case 'SCENARIO':
        return 'Situation professionnelle';
      case 'TECHNICAL':
        return 'Question technique';
      default:
        return 'Réponse ouverte';
    }
  }

  submit(): void {
    if (this.missingCount() > 0) {
      return;
    }
    const answers: EvaluationAnswers = {};
    for (const question of this.doc().sections.flatMap((section) => section.questions)) {
      answers[question.id] =
        question.type === 'OPEN' || question.type === 'TECHNICAL'
          ? this.text(question.id)
          : this.picks()[question.id] ?? [];
    }
    this.submitted.emit(answers);
  }
}
