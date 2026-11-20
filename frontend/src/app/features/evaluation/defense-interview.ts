import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  OnInit,
  output,
  signal,
} from '@angular/core';
import {
  DefenseInterviewDocument,
  EvaluationAnswers,
  EvaluationRecord,
  InterviewQuestion,
} from '../../core/models';
import { textAnswers } from './answers';

@Component({
  selector: 'wa-defense-interview',
  template: `
    <div class="jury">
      <header class="jury__head">
        <div class="jury__live"><i></i> Entretien simulé</div>
        <div class="jury__title">
          <strong>{{ doc().title }}</strong>
          <small>Jury de 3 évaluateurs · durée indicative {{ doc().durationMinutes }} minutes · {{ doc().questions.length }} questions</small>
        </div>
      </header>

      <div class="jury__body">
        <aside class="panel">
          <p class="panel__title">Composition du jury</p>
          <div class="member">
            <span class="member__avatar">AF</span>
            <div><strong>Ahmed El Fellah</strong><small>Responsable technique — fond</small></div>
          </div>
          <div class="member">
            <span class="member__avatar">KB</span>
            <div><strong>Karima Belkacem</strong><small>Experte métier — relances</small></div>
          </div>
          <div class="member">
            <span class="member__avatar">OB</span>
            <div><strong>Omar Benjelloun</strong><small>Pairs techniques — contre-exemples</small></div>
          </div>

          <p class="panel__title" style="margin-top: 16px">Fil de l’entretien</p>
          <div class="thread">
            @for (question of doc().questions; track question.id; let i = $index) {
              <button
                type="button"
                class="thread__item"
                [class.thread__item--active]="i === index()"
                [class.thread__item--done]="isDone(question)"
                (click)="go(i)"
              >
                <span class="thread__num">{{ i + 1 }}</span>
                <span class="thread__kind">{{ kindLabel(question.kind) }}</span>
              </button>
            }
          </div>
        </aside>

        <main class="room">
          <div class="opening">
            <span class="material-symbols-outlined">record_voice_over</span>
            <p>{{ doc().opening }}</p>
          </div>

          @if (current(); as question) {
            <section class="question">
              <div class="question__meta">
                <span class="question__kind" [attr.data-kind]="question.kind">{{ kindLabel(question.kind) }}</span>
                <span class="question__index">Question {{ index() + 1 }} / {{ doc().questions.length }}</span>
                <span class="question__points">{{ question.points }} pts</span>
              </div>

              <h2>{{ question.prompt }}</h2>

              <p class="question__expect">
                Le jury attend une réponse argumentée : position claire, justification, limites
                reconnues. Une réponse évasive est traitée comme une absence de maîtrise.
              </p>

              <textarea
                class="wa-textarea"
                rows="8"
                [attr.aria-label]="'Réponse à la question du jury : ' + question.prompt"
                [value]="answer(question.id)"
                (input)="setAnswer(question.id, $any($event.target).value)"
                placeholder="Répondez comme à l’oral : commencez par votre position, puis justifiez et nuancez."
              ></textarea>

              <div class="question__foot">
                <span class="question__count" [class.question__count--ok]="isDone(question)">
                  {{ answer(question.id).trim().length }} caractères — 30 minimum
                </span>
                <div class="eval-actions">
                  <button class="eval-btn eval-btn--ghost" type="button" [disabled]="index() === 0" (click)="go(index() - 1)">
                    <span class="material-symbols-outlined">arrow_back</span>
                    Précédente
                  </button>
                  @if (index() < doc().questions.length - 1) {
                    <button class="eval-btn" type="button" (click)="go(index() + 1)">
                      Question suivante
                      <span class="material-symbols-outlined">arrow_forward</span>
                    </button>
                  } @else {
                    <button class="eval-btn eval-btn--primary" type="button" [disabled]="!canSubmit()" (click)="submit()">
                      <span class="material-symbols-outlined">gavel</span>
                      Clore l’entretien
                    </button>
                  }
                </div>
              </div>
            </section>
          }

          <section class="progress">
            <div class="progress__bar">
              <span [style.width.%]="percent()"></span>
            </div>
            <span class="progress__label">{{ doneCount() }} / {{ doc().questions.length }} réponses jugées complètes</span>
          </section>
        </main>
      </div>
    </div>
  `,
  styleUrl: './evaluation.scss',
  styles: [
    `
      .jury {
        display: flex;
        flex-direction: column;
        gap: 14px;
      }
      .jury__head {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 14px 18px;
        border-radius: var(--wa-radius);
        background: #1e1b4b;
        color: #e0e7ff;
      }
      .jury__live {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-size: 9.5px;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        font-weight: 700;
        color: #fda4af;
      }
      .jury__live i {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: #fb7185;
        animation: rec 1.5s infinite;
      }
      @keyframes rec {
        50% {
          opacity: 0.3;
        }
      }
      .jury__title strong {
        display: block;
        font-size: 14.5px;
      }
      .jury__title small {
        font-size: 10.5px;
        color: #a5b4fc;
      }
      .jury__body {
        display: grid;
        grid-template-columns: 260px minmax(0, 1fr);
        gap: 14px;
        align-items: start;
      }
      .panel {
        position: sticky;
        top: 88px;
        background: #fff;
        border: 1px solid var(--wa-border);
        border-radius: var(--wa-radius);
        padding: 16px;
        box-shadow: var(--wa-shadow-xs);
      }
      .panel__title {
        margin: 0 0 10px;
        font-size: 10.5px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--wa-ink-faint);
        font-weight: 700;
      }
      .member {
        display: flex;
        gap: 9px;
        align-items: center;
        padding: 6px 0;
      }
      .member__avatar {
        width: 30px;
        height: 30px;
        flex: none;
        border-radius: 9px;
        background: #e0e7ff;
        color: #3730a3;
        display: grid;
        place-items: center;
        font-size: 10.5px;
        font-weight: 700;
      }
      .member strong {
        display: block;
        font-size: 11.5px;
      }
      .member small {
        font-size: 9.5px;
        color: var(--wa-ink-soft);
      }
      .thread {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .thread__item {
        display: flex;
        gap: 8px;
        align-items: center;
        padding: 6px 8px;
        border-radius: 8px;
        border: 1px solid transparent;
        background: var(--wa-surface-2);
        cursor: pointer;
        text-align: left;
      }
      .thread__item--active {
        border-color: #4f46e5;
        background: #eef2ff;
      }
      .thread__item--done .thread__num {
        background: var(--wa-success);
        color: #fff;
      }
      .thread__num {
        width: 20px;
        height: 20px;
        flex: none;
        border-radius: 5px;
        background: #e0e7ff;
        color: #3730a3;
        display: grid;
        place-items: center;
        font-size: 9.5px;
        font-weight: 700;
      }
      .thread__kind {
        font-size: 10.5px;
        color: var(--wa-ink-soft);
      }
      .room {
        display: flex;
        flex-direction: column;
        gap: 14px;
      }
      .opening {
        display: flex;
        gap: 11px;
        padding: 14px 16px;
        border-radius: var(--wa-radius);
        background: #eef2ff;
        color: #312e81;
        border: 1px solid #c7d2fe;
      }
      .opening p {
        margin: 0;
        font-size: 12.5px;
        line-height: 1.6;
      }
      .question {
        background: #fff;
        border: 1px solid var(--wa-border);
        border-radius: var(--wa-radius);
        padding: 20px 22px;
        box-shadow: var(--wa-shadow-xs);
      }
      .question__meta {
        display: flex;
        align-items: center;
        gap: 9px;
        margin-bottom: 12px;
      }
      .question__kind {
        font-size: 9.5px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.07em;
        padding: 3px 9px;
        border-radius: 999px;
        background: #eef2ff;
        color: #3730a3;
      }
      .question__kind[data-kind='RELANCE'] {
        background: #fdf3e2;
        color: #8a5800;
      }
      .question__kind[data-kind='CONTRE_EXEMPLE'] {
        background: var(--wa-danger-soft);
        color: #a21c12;
      }
      .question__kind[data-kind='SITUATION'] {
        background: #e7f7ef;
        color: #0a6b3d;
      }
      .question__index,
      .question__points {
        font-size: 10.5px;
        color: var(--wa-ink-faint);
      }
      .question__points {
        margin-left: auto;
      }
      .question h2 {
        margin: 0 0 8px;
        font-size: 18px;
        line-height: 1.45;
        letter-spacing: -0.01em;
      }
      .question__expect {
        margin: 0 0 12px;
        font-size: 11.5px;
        line-height: 1.55;
        color: var(--wa-ink-soft);
        padding-left: 10px;
        border-left: 2px solid #c7d2fe;
      }
      .question__foot {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
        margin-top: 10px;
      }
      .question__count {
        font-size: 10.5px;
        color: var(--wa-danger);
      }
      .question__count--ok {
        color: var(--wa-success);
      }
      .progress {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 0 4px;
      }
      .progress__bar {
        flex: 1;
        height: 6px;
        border-radius: 999px;
        background: var(--wa-surface-3);
        overflow: hidden;
      }
      .progress__bar span {
        display: block;
        height: 100%;
        background: #4f46e5;
      }
      .progress__label {
        font-size: 10.5px;
        color: var(--wa-ink-soft);
      }
      @media (max-width: 900px) {
        .jury__body {
          grid-template-columns: 1fr;
        }
        .panel {
          position: static;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DefenseInterview implements OnInit {
  readonly record = input.required<EvaluationRecord>();
  /** Brouillon de réponses déjà saisies (conservé à la navigation). */
  readonly draft = input<EvaluationAnswers>({});
  /** Émis à chaque modification : le parent conserve le brouillon. */
  readonly changed = output<EvaluationAnswers>();
  readonly submitted = output<EvaluationAnswers>();

  readonly doc = computed(() => this.record().document as DefenseInterviewDocument);
  readonly index = signal(0);
  private readonly answers = signal<Record<string, string>>({});

  /**
   * Réhydratation : quitter l'épreuve puis y revenir ne doit pas effacer
   * les réponses déjà données au jury.
   */
  ngOnInit(): void {
    this.answers.set(textAnswers(this.draft()));
  }

  readonly current = computed(() => {
    const items = this.doc().questions;
    return items[Math.min(this.index(), items.length - 1)];
  });

  readonly doneCount = computed(
    () => this.doc().questions.filter((question) => this.isDone(question)).length,
  );

  readonly percent = computed(() =>
    this.doc().questions.length === 0
      ? 0
      : Math.round((this.doneCount() / this.doc().questions.length) * 100),
  );

  answer(questionId: string): string {
    return this.answers()[questionId] ?? '';
  }

  setAnswer(questionId: string, value: string): void {
    this.answers.update((map) => ({ ...map, [questionId]: value }));
    this.changed.emit(this.currentAnswers());
  }

  /** Réponses courantes, dans le format attendu par le correcteur. */
  currentAnswers(): EvaluationAnswers {
    const answers: EvaluationAnswers = {};
    for (const question of this.doc().questions) {
      answers[question.id] = this.answer(question.id);
    }
    return answers;
  }

  isDone(question: InterviewQuestion): boolean {
    return this.answer(question.id).trim().length >= 30;
  }

  go(index: number): void {
    this.index.set(Math.max(0, Math.min(this.doc().questions.length - 1, index)));
  }

  canSubmit(): boolean {
    return this.doneCount() === this.doc().questions.length;
  }

  kindLabel(kind: InterviewQuestion['kind']): string {
    switch (kind) {
      case 'FOND':
        return 'Question de fond';
      case 'RELANCE':
        return 'Relance';
      case 'CONTRE_EXEMPLE':
        return 'Contre-exemple';
      default:
        return 'Mise en situation';
    }
  }

  submit(): void {
    if (!this.canSubmit()) {
      return;
    }
    this.submitted.emit(this.currentAnswers());
  }
}
