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
  ChallengeTask,
  EvaluationAnswers,
  EvaluationRecord,
  TechnicalChallengeDocument,
} from '../../core/models';

/** Reconstitue le type d'une ligne de journal à partir de son marqueur. */
function lineKind(text: string): 'in' | 'ok' | 'err' {
  if (text.startsWith('✓')) {
    return 'ok';
  }
  if (text.startsWith('✗')) {
    return 'err';
  }
  return 'in';
}

@Component({
  selector: 'wa-technical-challenge',
  template: `
    <div class="bench">
      <header class="bench__bar">
        <div>
          <span class="bench__eyebrow">Environnement épreuve</span>
          <strong>{{ doc().title }}</strong>
        </div>
        <div class="bench__meta">
          <span class="eval-badge"><span class="material-symbols-outlined">schedule</span>Durée indicative {{ doc().durationMinutes }} min</span>
          <span class="eval-badge"><span class="material-symbols-outlined">terminal</span>{{ doc().tasks.length }} tâches</span>
        </div>
      </header>

      <div class="bench__body">
        <aside class="tasks">
          <p class="tasks__title">Tâches à réaliser</p>
          @for (task of doc().tasks; track task.id; let index = $index) {
            <button
              type="button"
              class="task-tab"
              [class.task-tab--active]="active()?.id === task.id"
              [class.task-tab--done]="isTaskValid(task)"
              (click)="activeId.set(task.id)"
            >
              <span class="task-tab__num">{{ index + 1 }}</span>
              <span class="task-tab__body">
                <strong>{{ task.title }}</strong>
                <small>{{ task.points }} pts · {{ checkedFor(task.id).length }} / {{ task.successCriteria.length }} critères</small>
              </span>
            </button>
          }
          <div class="task-summary">
            <small>Critères validés</small>
            <strong>{{ totalChecked() }} / {{ totalCriteria() }}</strong>
            <div class="task-summary__bar"><span [style.width.%]="overallPercent()"></span></div>
          </div>
        </aside>

        @if (active(); as task) {
          <main class="work">
            <section class="eval-panel">
              <span class="eval-tag">Tâche {{ task.title }}</span>
              <h2 style="margin-top: 8px">{{ task.brief }}</h2>
              <div class="work__grid">
                <div class="eval-kv">
                  <span>Environnement</span>
                  <strong>{{ task.environment }}</strong>
                </div>
                <div class="eval-kv">
                  <span>Livrable attendu</span>
                  <strong>{{ task.deliverable }}</strong>
                </div>
              </div>
            </section>

            <section class="eval-panel">
              <h2>Étapes imposées</h2>
              <ol class="steps">
                @for (step of task.steps; track step) {
                  <li>{{ step }}</li>
                }
              </ol>

              <div class="terminal">
                <div class="terminal__head">
                  <span class="dot dot--r"></span><span class="dot dot--y"></span><span class="dot dot--g"></span>
                  <span class="terminal__host">challenge@workadapt</span>
                </div>
                <div class="terminal__body">
                  @for (line of lines(); track $index) {
                    <div class="terminal__line" [class.terminal__line--in]="line.kind === 'in'" [class.terminal__line--err]="line.kind === 'err'">
                      <code>{{ line.text }}</code>
                    </div>
                  }
                  @if (lines().length === 0) {
                    <p class="terminal__idle">Aucune commande exécutée pour cette tâche.</p>
                  }
                </div>
              </div>

              <div class="eval-actions" style="margin-top: 10px">
                <button class="eval-btn" type="button" (click)="runCheck(task)">
                  <span class="material-symbols-outlined">play_arrow</span>
                  Consigner le contrôle
                </button>
                <button class="eval-btn eval-btn--ghost" type="button" (click)="revealHint(task.id)">
                  <span class="material-symbols-outlined">lightbulb</span>
                  Indice
                </button>
                @if (hintFor(task.id)) {
                  <span class="work__hint">{{ hintFor(task.id) }}</span>
                }
              </div>
            </section>

            <section class="eval-panel">
              <h2>Critères de réussite vérifiables</h2>
              <p class="eval-panel__sub">
                Cochez uniquement ce qui est réellement observé dans votre rendu. Les critères
                éliminatoires sont signalés explicitement : sans eux, la tâche est invalidée.
              </p>
              <div class="criteria">
                @for (criterion of task.successCriteria; track criterion; let index = $index) {
                  <label class="criterion" [class.criterion--mandatory]="isBlocking(task, index)">
                    <input
                      type="checkbox"
                      [checked]="checkedFor(task.id).includes(index)"
                      (change)="toggleCriterion(task.id, index)"
                    />
                    <span>
                      <strong>{{ isBlocking(task, index) ? 'Éliminatoire — ' : '' }}{{ criterion }}</strong>
                      <small>{{ isBlocking(task, index) ? 'Sans ce critère, la tâche vaut 0.' : 'Critère de qualité vérifiable.' }}</small>
                    </span>
                  </label>
                }
              </div>
              @if (isTaskValid(task)) {
                <p class="valid">Tâche techniquement valide : critère éliminatoire satisfait.</p>
              } @else if (checkedFor(task.id).length > 0) {
                <p class="eval-note">Critère éliminatoire non coché : la tâche sera invalidée à la correction.</p>
              }
            </section>

            <section class="eval-panel">
              <h2>Note d’exécution</h2>
              <p class="eval-panel__sub">
                Décrivez les choix techniques et les résultats observés. Cette note est jointe à
                la correction.
              </p>
              <textarea
                class="wa-textarea"
                rows="3"
                [attr.aria-label]="'Note d’exécution pour la tâche : ' + task.title"
                [value]="noteFor(task.id)"
                (input)="setNote(task.id, $any($event.target).value)"
                placeholder="Ex. Image multi-étapes 148 Mo, utilisateur non root, healthcheck OK ; test de restauration réussi."
              ></textarea>
            </section>
          </main>
        }
      </div>

      <footer class="bench__foot">
        <p class="eval-panel__sub" style="margin: 0">
          La correction vérifie chaque critère. Un rendu sans critère éliminatoire ne peut pas
          réussir, même si le reste est bon.
        </p>
        <button
          class="eval-btn eval-btn--primary"
          type="button"
          [disabled]="!allTasksValid()"
          (click)="submit()"
        >
          <span class="material-symbols-outlined">engineering</span>
          Rendre l’épreuve technique
        </button>
      </footer>
    </div>
  `,
  styleUrl: './evaluation.scss',
  styles: [
    `
      .bench {
        display: flex;
        flex-direction: column;
        gap: 14px;
      }
      .bench__bar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 14px;
        padding: 14px 18px;
        border-radius: var(--wa-radius);
        background: #0b2b2a;
        color: #e4fffb;
      }
      .bench__eyebrow {
        display: block;
        font-size: 9.5px;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        color: #7fd6cd;
        font-weight: 700;
      }
      .bench__meta {
        display: flex;
        gap: 8px;
      }
      .bench__meta .eval-badge {
        color: #d8fff9;
      }
      .bench__body {
        display: grid;
        grid-template-columns: 260px minmax(0, 1fr);
        gap: 14px;
        align-items: start;
      }
      .tasks {
        position: sticky;
        top: 88px;
        background: #fff;
        border: 1px solid var(--wa-border);
        border-radius: var(--wa-radius);
        padding: 14px;
        box-shadow: var(--wa-shadow-xs);
      }
      .tasks__title {
        margin: 0 0 10px;
        font-size: 10.5px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--wa-ink-faint);
        font-weight: 700;
      }
      .task-tab {
        display: flex;
        gap: 9px;
        width: 100%;
        text-align: left;
        padding: 9px 10px;
        border-radius: 10px;
        border: 1px solid transparent;
        background: var(--wa-surface-2);
        cursor: pointer;
        margin-bottom: 6px;
      }
      .task-tab--active {
        border-color: #0e9f9a;
        background: #e6f7f6;
      }
      .task-tab--done {
        background: var(--wa-success-soft);
      }
      .task-tab__num {
        flex: none;
        width: 24px;
        height: 24px;
        border-radius: 7px;
        background: #d6efec;
        color: #0b6b66;
        display: grid;
        place-items: center;
        font-size: 11px;
        font-weight: 700;
      }
      .task-tab__body strong {
        display: block;
        font-size: 12px;
        line-height: 1.35;
      }
      .task-tab__body small {
        font-size: 10px;
        color: var(--wa-ink-soft);
      }
      .task-summary {
        border-top: 1px dashed var(--wa-border);
        margin-top: 10px;
        padding-top: 10px;
      }
      .task-summary small {
        font-size: 10px;
        color: var(--wa-ink-soft);
      }
      .task-summary strong {
        display: block;
        font-size: 17px;
      }
      .task-summary__bar {
        margin-top: 5px;
        height: 6px;
        border-radius: 999px;
        background: var(--wa-surface-3);
        overflow: hidden;
      }
      .task-summary__bar span {
        display: block;
        height: 100%;
        background: #0e9f9a;
      }
      .work {
        display: flex;
        flex-direction: column;
        gap: 14px;
      }
      .work__grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
      }
      .steps {
        margin: 0 0 12px;
        padding-left: 20px;
        font-size: 12.5px;
        line-height: 1.7;
      }
      .terminal {
        border-radius: 11px;
        overflow: hidden;
        background: #061614;
        border: 1px solid #14413c;
      }
      .terminal__head {
        display: flex;
        align-items: center;
        gap: 5px;
        padding: 7px 11px;
        background: #0b2b2a;
      }
      .dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
      }
      .dot--r {
        background: #f87171;
      }
      .dot--y {
        background: #fbbf24;
      }
      .dot--g {
        background: #34d399;
      }
      .terminal__host {
        margin-left: 8px;
        font-size: 10.5px;
        color: #7fd6cd;
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      }
      .terminal__body {
        padding: 11px 13px;
        min-height: 92px;
        max-height: 190px;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 4px;
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      }
      .terminal__line code {
        font-size: 11.5px;
        color: #9fb9b4;
      }
      .terminal__line--in code {
        color: #e4fffb;
      }
      .terminal__line--err code {
        color: #fca5a5;
      }
      .terminal__idle {
        margin: 0;
        font-size: 11px;
        color: #4d6f6a;
      }
      .work__hint {
        font-size: 11.5px;
        color: #7a4d00;
        background: var(--wa-warning-soft);
        padding: 6px 10px;
        border-radius: 8px;
      }
      .criteria {
        display: grid;
        gap: 7px;
      }
      .criterion {
        display: flex;
        gap: 10px;
        align-items: flex-start;
        padding: 9px 11px;
        border-radius: 9px;
        background: var(--wa-surface-2);
        border: 1px solid transparent;
      }
      .criterion--mandatory {
        border-color: #f0c9c5;
        background: #fdf5f4;
      }
      .criterion input {
        margin-top: 2px;
      }
      .criterion strong {
        display: block;
        font-size: 12.5px;
        font-weight: 600;
      }
      .criterion small {
        font-size: 10.5px;
        color: var(--wa-ink-soft);
      }
      .valid {
        margin: 10px 0 0;
        padding: 9px 12px;
        border-radius: 9px;
        background: var(--wa-success-soft);
        color: #0a6b3d;
        font-size: 12px;
      }
      .bench__foot {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 14px;
        flex-wrap: wrap;
        padding: 14px 18px;
        border-radius: var(--wa-radius);
        border: 1px solid var(--wa-border);
        background: #fff;
      }
      @media (max-width: 900px) {
        .bench__body {
          grid-template-columns: 1fr;
        }
        .tasks {
          position: static;
        }
        .work__grid {
          grid-template-columns: 1fr;
        }
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TechnicalChallenge implements OnInit {
  readonly record = input.required<EvaluationRecord>();
  /** Brouillon de réponses déjà saisies (conservé à la navigation). */
  readonly draft = input<EvaluationAnswers>({});
  /** Émis à chaque modification : le parent conserve le brouillon. */
  readonly changed = output<EvaluationAnswers>();
  readonly submitted = output<EvaluationAnswers>();

  readonly doc = computed(() => this.record().document as TechnicalChallengeDocument);
  readonly activeId = signal('');

  private readonly checks = signal<Record<string, number[]>>({});
  private readonly notes = signal<Record<string, string>>({});
  private readonly hints = signal<Record<string, string>>({});
  private readonly logs = signal<Record<string, { kind: 'in' | 'ok' | 'err'; text: string }[]>>({});

  /**
   * Réhydratation : quitter l'épreuve puis y revenir ne doit pas effacer
   * les critères cochés, les notes, les indices et le journal.
   */
  ngOnInit(): void {
    const saved = this.draft();
    const checks: Record<string, number[]> = {};
    const notes: Record<string, string> = {};
    const hints: Record<string, string> = {};
    const logs: Record<string, { kind: 'in' | 'ok' | 'err'; text: string }[]> = {};

    for (const task of this.doc().tasks) {
      const picked = saved[task.id];
      if (Array.isArray(picked)) {
        checks[task.id] = picked.filter((value): value is number => typeof value === 'number');
      }
      const note = saved[`${task.id}::note`];
      if (typeof note === 'string') {
        notes[task.id] = note;
      }
      if (saved[`${task.id}::hint`] !== undefined) {
        hints[task.id] = task.hint;
      }
      const log = saved[`${task.id}::log`];
      if (typeof log === 'string') {
        const lines = log.split('\n').filter((line) => line.trim().length > 0);
        if (lines.length > 0) {
          logs[task.id] = lines.map((text) => ({ kind: lineKind(text), text }));
        }
      }
    }

    this.checks.set(checks);
    this.notes.set(notes);
    this.hints.set(hints);
    this.logs.set(logs);
  }

  /** Réponses courantes, dans le format attendu par le correcteur. */
  currentAnswers(): EvaluationAnswers {
    const answers: EvaluationAnswers = {};
    for (const task of this.doc().tasks) {
      answers[task.id] = this.checkedFor(task.id);
      const note = this.noteFor(task.id).trim();
      if (note.length > 0) {
        answers[`${task.id}::note`] = note;
      }
      const log = this.linesFor(task.id)
        .map((line) => line.text)
        .join('\n');
      if (log.length > 0) {
        answers[`${task.id}::log`] = log;
      }
      // L'usage d'un indice réduit le score de la tâche : il est transmis.
      if (this.hintFor(task.id).trim().length > 0) {
        answers[`${task.id}::hint`] = 1;
      }
    }
    return answers;
  }

  private emitChange(): void {
    this.changed.emit(this.currentAnswers());
  }

  readonly active = computed(() => {
    const tasks = this.doc().tasks;
    return tasks.find((task) => task.id === this.activeId()) ?? tasks[0];
  });

  readonly lines = computed(() => this.logs()[this.active()?.id ?? ''] ?? []);

  readonly totalCriteria = computed(() =>
    this.doc().tasks.reduce((sum, task) => sum + task.successCriteria.length, 0),
  );

  readonly totalChecked = computed(() =>
    this.doc().tasks.reduce((sum, task) => sum + this.checkedFor(task.id).length, 0),
  );

  readonly overallPercent = computed(() =>
    this.totalCriteria() === 0 ? 0 : Math.round((this.totalChecked() / this.totalCriteria()) * 100),
  );

  /**
   * L'épreuve ne peut être rendue que si chaque tâche satisfait son critère
   * éliminatoire : sinon la tâche est invalidée à la correction et la
   * remise n'aurait aucun sens.
   */
  readonly allTasksValid = computed(() =>
    this.doc().tasks.every((task) => this.isTaskValid(task)),
  );

  checkedFor(taskId: string): number[] {
    return this.checks()[taskId] ?? [];
  }

  toggleCriterion(taskId: string, index: number): void {
    this.checks.update((map) => {
      const current = map[taskId] ?? [];
      return {
        ...map,
        [taskId]: current.includes(index)
          ? current.filter((value) => value !== index)
          : [...current, index],
      };
    });
    this.emitChange();
  }

  isBlocking(task: ChallengeTask, index: number): boolean {
    return (task.blockingCriteria ?? []).includes(index);
  }

  isTaskValid(task: ChallengeTask): boolean {
    return (task.blockingCriteria ?? []).every((index) =>
      this.checkedFor(task.id).includes(index),
    );
  }

  noteFor(taskId: string): string {
    return this.notes()[taskId] ?? '';
  }

  setNote(taskId: string, value: string): void {
    this.notes.update((map) => ({ ...map, [taskId]: value }));
    this.emitChange();
  }

  hintFor(taskId: string): string {
    return this.hints()[taskId] ?? '';
  }

  revealHint(taskId: string): void {
    const task = this.doc().tasks.find((item) => item.id === taskId);
    if (task) {
      this.hints.update((map) => ({ ...map, [taskId]: task.hint }));
      this.emitChange();
    }
  }

  /**
   * Consigne le contrôle effectué dans le journal de la tâche.
   *
   * Le frontend ne peut pas exécuter l'environnement technique du backend :
   * la trace consignée est donc un journal des vérifications déclarées par
   * l'employé, pas une exécution réelle. Le libellé le dit explicitement.
   */
  runCheck(task: ChallengeTask): void {
    const id = task.id;
    this.logs.update((map) => ({
      ...map,
      [id]: [
        ...(map[id] ?? []),
        { kind: 'in', text: `$ vérif --tache ${task.id}` },
        this.isTaskValid(task)
          ? {
              kind: 'ok',
              text: `✓ Contrôle consigné — critère éliminatoire déclaré satisfait. Environnement : ${task.environment}`,
            }
          : { kind: 'err', text: '✗ Critère éliminatoire non satisfait — corrigez avant de rendre.' },
      ],
    }));
    this.emitChange();
  }

  /** Journal d'une tâche : il est transmis au correcteur. */
  linesFor(taskId: string): { kind: 'in' | 'ok' | 'err'; text: string }[] {
    return this.logs()[taskId] ?? [];
  }

  submit(): void {
    if (!this.allTasksValid()) {
      return;
    }
    this.submitted.emit(this.currentAnswers());
  }
}
