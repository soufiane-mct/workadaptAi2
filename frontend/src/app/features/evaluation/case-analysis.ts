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
  CaseAnalysisDocument,
  EvaluationAnswers,
  EvaluationRecord,
} from '../../core/models';
import { textAnswers } from './answers';

@Component({
  selector: 'wa-case-analysis',
  template: `
    <div class="case">
      <header class="case__head">
        <div>
          <span class="case__eyebrow">Dossier d’analyse</span>
          <strong>{{ doc().title }}</strong>
          <small>Durée indicative {{ doc().durationMinutes }} minutes · {{ doc().questions.length }} questions</small>
        </div>
        <span class="eval-badge"><span class="material-symbols-outlined">folder_open</span>Cas réel anonymisé</span>
      </header>

      <div class="case__body">
        <aside class="file">
          <p class="file__title">Pièces du dossier</p>
          <div class="file__role">
            <small>Votre rôle</small>
            <strong>{{ doc().caseFile.role }}</strong>
          </div>
          <p class="file__context">{{ doc().caseFile.context }}</p>

          <h3 class="file__sub">Symptômes observés</h3>
          <ul class="file__symptoms">
            @for (symptom of doc().caseFile.symptoms; track symptom) {
              <li>{{ symptom }}</li>
            }
          </ul>

          <h3 class="file__sub">Données disponibles</h3>
          <table class="file__data">
            <tbody>
              @for (row of doc().caseFile.data; track row.label) {
                <tr>
                  <th>{{ row.label }}</th>
                  <td>{{ row.value }}</td>
                </tr>
              }
            </tbody>
          </table>

          <h3 class="file__sub">Contraintes</h3>
          <ul class="file__constraints">
            @for (constraint of doc().caseFile.constraints; track constraint) {
              <li>{{ constraint }}</li>
            }
          </ul>
        </aside>

        <main class="analysis">
          <section class="eval-panel">
            <h2>Consignes d’analyse</h2>
            <ol class="instructions">
              @for (instruction of doc().instructions; track instruction) {
                <li>{{ instruction }}</li>
              }
            </ol>
          </section>

          @for (question of doc().questions; track question.id; let index = $index) {
            <section class="eval-panel question" [class.question--done]="isDone(question.id)">
              <div class="question__head">
                <span class="question__num">{{ index + 1 }}</span>
                <div>
                  <h2>{{ question.prompt }}</h2>
                  <p class="eval-panel__sub" style="margin-bottom: 0">{{ question.guidance }}</p>
                </div>
                <span class="question__points">{{ question.points }} pts</span>
              </div>

              <textarea
                class="wa-textarea"
                rows="5"
                [attr.aria-label]="'Réponse à la question : ' + question.prompt"
                [value]="answer(question.id)"
                (input)="setAnswer(question.id, $any($event.target).value)"
                placeholder="Structurez : faits observés → hypothèses → décision → vérification."
              ></textarea>

              <div class="question__foot">
                <span class="question__count" [class.question__count--ok]="isDone(question.id)">
                  {{ answer(question.id).trim().length }} caractères
                  @if (!isDone(question.id)) {
                    — {{ Math.max(0, 60 - answer(question.id).trim().length) }} restants
                  }
                </span>
                <div class="themes">
                  @for (theme of question.expectedThemes; track theme) {
                    <span class="theme">{{ theme }}</span>
                  }
                </div>
              </div>
            </section>
          }

          <section class="eval-panel submit">
            <div>
              <h2>Remise de l’analyse</h2>
              <p class="eval-panel__sub" style="margin-bottom: 0">
                {{ doneCount() }} / {{ doc().questions.length }} réponses suffisamment développées.
                Une réponse courte est corrigée comme une absence de raisonnement.
              </p>
            </div>
            <button class="eval-btn eval-btn--primary" type="button" [disabled]="doneCount() < doc().questions.length" (click)="submit()">
              <span class="material-symbols-outlined">send</span>
              Remettre l’analyse de cas
            </button>
          </section>
        </main>
      </div>
    </div>
  `,
  styleUrl: './evaluation.scss',
  styles: [
    `
      .case {
        display: flex;
        flex-direction: column;
        gap: 14px;
      }
      .case__head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 14px;
        padding: 14px 18px;
        border-radius: var(--wa-radius);
        background: linear-gradient(135deg, #3b2506, #6b4409);
        color: #fff;
      }
      .case__eyebrow {
        display: block;
        font-size: 9.5px;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        color: #f4c97a;
        font-weight: 700;
      }
      .case__head strong {
        font-size: 15px;
      }
      .case__head small {
        display: block;
        font-size: 10.5px;
        color: rgba(255, 255, 255, 0.66);
      }
      .case__body {
        display: grid;
        grid-template-columns: 330px minmax(0, 1fr);
        gap: 14px;
        align-items: start;
      }
      .file {
        position: sticky;
        top: 88px;
        background: #fffdf7;
        border: 1px solid #e8ddc4;
        border-radius: var(--wa-radius);
        padding: 16px;
        box-shadow: var(--wa-shadow-xs);
        max-height: calc(100vh - 120px);
        overflow-y: auto;
      }
      .file__title {
        margin: 0 0 12px;
        font-size: 10.5px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: #8a6a2a;
        font-weight: 700;
      }
      .file__role {
        padding: 9px 11px;
        border-radius: 9px;
        background: #fdf3e2;
        margin-bottom: 10px;
      }
      .file__role small {
        display: block;
        font-size: 9.5px;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: #8a6a2a;
      }
      .file__role strong {
        font-size: 12.5px;
      }
      .file__context {
        margin: 0 0 4px;
        font-size: 12px;
        line-height: 1.6;
      }
      .file__sub {
        margin: 14px 0 6px;
        font-size: 10.5px;
        text-transform: uppercase;
        letter-spacing: 0.07em;
        color: #8a6a2a;
      }
      .file__symptoms,
      .file__constraints {
        margin: 0;
        padding-left: 17px;
        font-size: 11.5px;
        line-height: 1.6;
      }
      .file__data {
        width: 100%;
        border-collapse: collapse;
        font-size: 11px;
      }
      .file__data th {
        text-align: left;
        color: var(--wa-ink-soft);
        font-weight: 600;
        padding: 4px 0;
        width: 52%;
      }
      .file__data td {
        padding: 4px 0;
        font-weight: 600;
      }
      .file__data tr {
        border-bottom: 1px dashed #e8ddc4;
      }
      .analysis {
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
      .question--done {
        border-left: 4px solid #b26a00;
      }
      .question__head {
        display: flex;
        gap: 10px;
        align-items: flex-start;
        margin-bottom: 10px;
      }
      .question__head h2 {
        margin: 0 0 3px;
        font-size: 13.5px;
        line-height: 1.45;
      }
      .question__num {
        flex: none;
        width: 26px;
        height: 26px;
        border-radius: 7px;
        background: #fdf3e2;
        color: #8a5800;
        display: grid;
        place-items: center;
        font-size: 12px;
        font-weight: 700;
      }
      .question__points {
        margin-left: auto;
        font-size: 10.5px;
        color: var(--wa-ink-faint);
      }
      .question__foot {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
        margin-top: 7px;
      }
      .question__count {
        font-size: 10.5px;
        color: var(--wa-danger);
      }
      .question__count--ok {
        color: var(--wa-success);
      }
      .themes {
        display: flex;
        flex-wrap: wrap;
        gap: 5px;
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
      @media (max-width: 950px) {
        .case__body {
          grid-template-columns: 1fr;
        }
        .file {
          position: static;
          max-height: none;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CaseAnalysis implements OnInit {
  readonly record = input.required<EvaluationRecord>();
  /** Brouillon de réponses déjà saisies (conservé à la navigation). */
  readonly draft = input<EvaluationAnswers>({});
  /** Émis à chaque modification : le parent conserve le brouillon. */
  readonly changed = output<EvaluationAnswers>();
  readonly submitted = output<EvaluationAnswers>();

  readonly doc = computed(() => this.record().document as CaseAnalysisDocument);
  private readonly answers = signal<Record<string, string>>({});
  readonly Math = Math;

  /**
   * Réhydratation : quitter l'épreuve puis y revenir ne doit pas effacer
   * les analyses déjà rédigées.
   */
  ngOnInit(): void {
    this.answers.set(textAnswers(this.draft()));
  }

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

  isDone(questionId: string): boolean {
    return this.answer(questionId).trim().length >= 60;
  }

  readonly doneCount = computed(
    () => this.doc().questions.filter((question) => this.isDone(question.id)).length,
  );

  submit(): void {
    if (this.doneCount() < this.doc().questions.length) {
      return;
    }
    this.submitted.emit(this.currentAnswers());
  }
}
