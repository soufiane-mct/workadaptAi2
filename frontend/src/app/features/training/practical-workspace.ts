import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { Lab, PracticalProgram, StepEvidence } from '../../core/models';
import { StepVerdict } from './step-verdict';
import { WorkspaceBase } from './workspace-base';

@Component({
  selector: 'wa-practical-workspace',
  imports: [StepVerdict],
  template: `
    <div class="ws-body">
      <aside class="ws-panel">
        <h2>Laboratoires</h2>
        <p class="ws-panel__sub">{{ units().length }} labs · environnement isolé</p>
        <div class="ws-list">
          @for (unit of units(); track unit.id; let index = $index) {
            <button
              type="button"
              class="ws-unit"
              [class.ws-unit--active]="activeUnit()?.id === unit.id"
              [class.ws-unit--done]="isDone(unit.id)"
              [class.ws-unit--locked]="isLocked(unit.id)"
              (click)="openLab(unit.id)"
            >
              <span class="ws-unit__index">{{ isDone(unit.id) ? '✓' : index + 1 }}</span>
              <span class="ws-unit__title">
                {{ unit.title }}
                <span class="ws-unit__kind">{{ unit.minutes }} min</span>
              </span>
              <span class="mode-dot" [attr.data-mode]="labFor(unit.id)?.validationMode"></span>
            </button>
          }
        </div>
        <div class="legend">
          <span><i class="mode-dot" data-mode="AUTO"></i> Auto</span>
          <span><i class="mode-dot" data-mode="CRITERIA"></i> Critères</span>
          <span><i class="mode-dot" data-mode="HUMAN"></i> Humain</span>
        </div>
      </aside>

      @if (lab(); as current) {
        <main class="ws-main">
          <section class="ws-panel lab-head">
            <div>
              <span class="ws-tag">Lab {{ current.order }}</span>
              <h2 style="margin-top: 8px">{{ current.title }}</h2>
              <p class="ws-panel__sub" style="margin-bottom: 0">{{ current.brief }}</p>
            </div>
            <div class="env">
              <span class="material-symbols-outlined">dns</span>
              <div>
                <small>Environnement</small>
                <strong>{{ current.environment }}</strong>
              </div>
            </div>
          </section>

          <section class="ws-panel">
            <h2>Console du lab</h2>
            <p class="ws-panel__sub">Commandes guidées — exécution simulée, sortie réelle du scénario.</p>
            <div class="console">
              @for (line of consoleLines(); track $index) {
                <div class="console__line" [class.console__line--in]="line.kind === 'in'" [class.console__line--ok]="line.kind === 'ok'" [class.console__line--err]="line.kind === 'err'">
                  <span class="console__prompt">{{ line.kind === 'in' ? '$' : '›' }}</span>
                  <code>{{ line.text }}</code>
                </div>
              }
              @if (consoleLines().length === 0) {
                <p class="console__idle">Console vide. Lancez une commande ci-dessous.</p>
              }
            </div>
            <div class="commands">
              @for (command of current.commands; track command; let index = $index) {
                <button
                  type="button"
                  class="command"
                  [disabled]="!editable() || isDone(current.id) || executed().includes(index)"
                  (click)="runCommand(index, command)"
                >
                  <span class="material-symbols-outlined">terminal</span>
                  <code>{{ command }}</code>
                </button>
              }
            </div>
          </section>

          <section class="ws-panel">
            <h2>Étapes du lab</h2>
            <div class="steps">
              @for (step of current.steps; track step; let index = $index) {
                <label class="ws-check">
                  <input
                    type="checkbox"
                    [checked]="isStepChecked(current, index)"
                    [disabled]="current.validationMode === 'AUTO' || !editable() || isDone(current.id)"
                    (change)="toggleStep(index)"
                  />
                  <span><strong>Étape {{ index + 1 }}.</strong> {{ step }}</span>
                </label>
              }
            </div>

            <h2 style="margin-top: 16px">Indices progressifs</h2>
            <p class="ws-panel__sub">
              Chaque indice consulté est enregistré. Ils ne pénalisent pas, mais évitent de
              bloquer inutilement.
            </p>
            <div class="hints">
              @for (hint of current.hints; track hint; let index = $index) {
                @if (hintIndex() >= index) {
                  <p class="hint">💡 {{ hint }}</p>
                }
              }
              @if (hintIndex() < current.hints.length - 1) {
                <button class="btn" type="button" (click)="revealHint()">
                  <span class="material-symbols-outlined">lightbulb</span>
                  {{ hintIndex() < 0 ? 'Afficher un premier indice' : 'Indice suivant' }}
                </button>
              }
            </div>
          </section>

          <section class="ws-panel">
            <h2>Critères de réussite</h2>
            <p class="ws-panel__sub">
              @if (current.validationMode === 'AUTO') {
                Validation automatique : les critères se cochent dès que toutes les commandes du
                lab ont été exécutées.
              } @else {
                Validation {{ modeLabel(current.validationMode) }}. Tous les critères doivent être
                cochés avant de terminer le lab.
              }
            </p>
            <div class="criteria">
              @for (criterion of current.successCriteria; track criterion; let index = $index) {
                <label class="ws-check criterion">
                  <input
                    type="checkbox"
                    [checked]="isCriterionChecked(current, index)"
                    [disabled]="current.validationMode === 'AUTO' || !editable() || isDone(current.id)"
                    (change)="toggleCriterion(index)"
                  />
                  <span>{{ criterion }}</span>
                </label>
              }
            </div>

            <h2 style="margin-top: 16px">Ce que vous avez observé</h2>
            <p class="ws-panel__sub">
              Une case cochée ne prouve rien : l’agent lit vos observations et les compare aux
              critères. Sans constat, l’étape vous est renvoyée.
            </p>
            @for (criterion of current.successCriteria; track criterion; let index = $index) {
              <label class="observation">
                <span>{{ criterion }}</span>
                <textarea
                  class="wa-textarea"
                  rows="2"
                  [disabled]="!editable() || isDone(current.id)"
                  [value]="observation(current.id, index)"
                  (input)="setObservation(current.id, index, $any($event.target).value)"
                  placeholder="Constat observé : commande, sortie, résultat vérifié…"
                ></textarea>
              </label>
            }

            <label class="observation observation--restitution">
              <span>Restitution de votre travail</span>
              <textarea
                class="wa-textarea"
                rows="4"
                [disabled]="!editable() || isDone(current.id)"
                [value]="restitution(current.id)"
                (input)="setRestitution(current.id, $any($event.target).value)"
                placeholder="Décrivez ce que vous avez réellement fait : commandes exécutées, résultat obtenu, ce qui a changé, ce qui reste à faire."
              ></textarea>
            </label>

            <div class="ws-actions">
              <button
                class="btn btn--primary"
                type="button"
                [disabled]="!canValidate(current)"
                (click)="validate(current)"
              >
                <span class="material-symbols-outlined">
                  {{ current.validationMode === 'HUMAN' ? 'send' : 'fact_check' }}
                </span>
                {{ isDone(current.id) ? 'Lab validé' : current.validationMode === 'HUMAN' ? 'Soumettre au superviseur' : 'Faire vérifier par l’agent' }}
              </button>
              <span class="wa-small wa-muted">
                {{ isDone(current.id) ? 'Travail vérifié et enregistré' : progressLabel(current) }}
              </span>
            </div>

            <wa-step-verdict [verification]="verification()" />
          </section>

          <section class="ws-panel final">
            <span class="ws-tag">Tâche finale</span>
            <h2 style="margin-top: 8px">{{ pp().finalTask.title }}</h2>
            <p class="ws-panel__sub">{{ pp().finalTask.brief }}</p>
            <div class="ws-kv">
              <span>Livrable attendu</span>
              <strong>{{ pp().finalTask.deliverable }}</strong>
            </div>
          </section>
        </main>
      }
    </div>
  `,
  styleUrl: './workspace.scss',
  styles: [
    `
      .mode-dot {
        width: 9px;
        height: 9px;
        flex: none;
        border-radius: 50%;
        background: var(--wa-ink-faint);
      }
      .observation {
        display: block;
        margin-top: 10px;
      }
      .observation > span {
        display: block;
        font-size: 11.5px;
        font-weight: 600;
        color: var(--wa-ink-soft);
        margin-bottom: 4px;
      }
      .observation textarea {
        width: 100%;
        resize: vertical;
      }
      .observation--restitution {
        margin-top: 16px;
        padding-top: 12px;
        border-top: 1px dashed var(--wa-border);
      }
      .mode-dot[data-mode='AUTO'] {
        background: #0e9f9a;
      }
      .mode-dot[data-mode='CRITERIA'] {
        background: #b26a00;
      }
      .mode-dot[data-mode='HUMAN'] {
        background: #7c3aed;
      }
      .legend {
        display: flex;
        gap: 12px;
        margin-top: 14px;
        padding-top: 12px;
        border-top: 1px dashed var(--wa-border);
        font-size: 10.5px;
        color: var(--wa-ink-soft);
      }
      .legend span {
        display: inline-flex;
        align-items: center;
        gap: 5px;
      }
      .lab-head {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 16px;
        flex-wrap: wrap;
      }
      .env {
        display: flex;
        align-items: center;
        gap: 9px;
        padding: 10px 13px;
        border-radius: 11px;
        background: #0d2f2d;
        color: #d7f5f2;
      }
      .env small {
        display: block;
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: #8fd6d0;
      }
      .env strong {
        font-size: 11.5px;
      }
      .console {
        border-radius: 12px;
        background: #0b1220;
        padding: 14px;
        min-height: 140px;
        display: flex;
        flex-direction: column;
        gap: 5px;
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      }
      .console__line {
        display: flex;
        gap: 8px;
        font-size: 12px;
        color: #c9d6ea;
      }
      .console__line--in code {
        color: #ffffff;
      }
      .console__line--ok code {
        color: #4ade80;
      }
      .console__line--err code {
        color: #f87171;
      }
      .console__prompt {
        color: #5eead4;
        font-weight: 700;
      }
      .console__idle {
        margin: 0;
        font-size: 11.5px;
        color: #64748b;
      }
      .commands {
        display: grid;
        gap: 6px;
        margin-top: 12px;
      }
      .command {
        display: flex;
        align-items: center;
        gap: 9px;
        text-align: left;
        padding: 9px 11px;
        border-radius: 9px;
        border: 1px solid var(--wa-border);
        background: var(--wa-surface-2);
        cursor: pointer;
        font-size: 12px;
      }
      .command code {
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      }
      .command:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .steps,
      .criteria {
        display: flex;
        flex-direction: column;
      }
      .criterion {
        border-bottom: 1px dashed var(--wa-border);
      }
      .criterion:last-child {
        border-bottom: none;
      }
      .hints {
        display: flex;
        flex-direction: column;
        gap: 8px;
        align-items: flex-start;
      }
      .hint {
        margin: 0;
        padding: 10px 12px;
        border-radius: 10px;
        background: var(--wa-warning-soft);
        color: #7a4d00;
        font-size: 12.5px;
        line-height: 1.5;
      }
      .final {
        border-left: 4px solid #0e9f9a;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PracticalWorkspace extends WorkspaceBase {
  readonly pp = computed(() => this.program() as PracticalProgram);
  readonly lab = computed(() => this.pp().labs.find((item) => item.id === this.activeUnit()?.id));

  readonly executed = signal<number[]>([]);
  readonly attempts = signal<Record<number, number>>({});
  readonly checked = signal<number[]>([]);
  readonly criteriaChecked = signal<number[]>([]);
  readonly observations = signal<Record<string, string>>({});
  readonly restitutions = signal<Record<string, string>>({});
  readonly hintIndex = signal(-1);
  readonly consoleLines = signal<{ kind: 'in' | 'ok' | 'err'; text: string }[]>([]);

  labFor(unitId: string): Lab | undefined {
    return this.pp().labs.find((item) => item.id === unitId);
  }

  openLab(unitId: string): void {
    this.select(unitId);
    this.executed.set([]);
    this.attempts.set({});
    this.checked.set([]);
    this.criteriaChecked.set([]);
    this.hintIndex.set(-1);
    this.consoleLines.set([]);
    this.verification.set(undefined);
  }

  runCommand(index: number, command: string): void {
    if (this.executed().includes(index)) {
      return;
    }
    const attempt = (this.attempts()[index] ?? 0) + 1;
    this.attempts.update((list) => ({ ...list, [index]: attempt }));
    this.consoleLines.update((lines) => [...lines, { kind: 'in', text: command }]);
    // Un premier essai sur certaines commandes échoue volontairement : la
    // deuxième tentative réussit, ce qui oblige à lire le message d'erreur.
    const success = index % 3 !== 2 || attempt >= 2;
    if (success) {
      this.executed.update((list) => [...list, index]);
      this.consoleLines.update((lines) => [
        ...lines,
        { kind: 'ok', text: this.consoleOutput(index) },
      ]);
      return;
    }
    this.consoleLines.update((lines) => [
      ...lines,
      {
        kind: 'err',
        text: 'Échec : la ressource demandée est introuvable. Vérifiez le nom, puis réessayez la commande.',
      },
    ]);
  }

  toggleStep(index: number): void {
    this.checked.update((list) =>
      list.includes(index) ? list.filter((value) => value !== index) : [...list, index],
    );
  }

  toggleCriterion(index: number): void {
    this.criteriaChecked.update((list) =>
      list.includes(index) ? list.filter((value) => value !== index) : [...list, index],
    );
  }

  observation(labId: string, index: number): string {
    return this.observations()[`${labId}:${index}`] ?? '';
  }

  setObservation(labId: string, index: number, value: string): void {
    this.observations.update((map) => ({ ...map, [`${labId}:${index}`]: value }));
  }

  restitution(labId: string): string {
    return this.restitutions()[labId] ?? '';
  }

  setRestitution(labId: string, value: string): void {
    this.restitutions.update((map) => ({ ...map, [labId]: value }));
  }

  revealHint(): void {
    this.hintIndex.update((value) => Math.min(this.lab()!.hints.length - 1, value + 1));
  }

  canValidate(lab: Lab): boolean {
    if (!this.editable() || this.isDone(lab.id)) {
      return false;
    }
    if (lab.validationMode === 'AUTO') {
      return this.executed().length > 0;
    }
    return this.criteriaChecked().length > 0 || this.checked().length > 0;
  }

  isStepChecked(lab: Lab, index: number): boolean {
    if (lab.validationMode === 'AUTO') {
      return this.executed().length > index;
    }
    return this.checked().includes(index);
  }

  isCriterionChecked(lab: Lab, index: number): boolean {
    if (lab.validationMode === 'AUTO') {
      return this.executed().length >= lab.commands.length;
    }
    return this.criteriaChecked().includes(index);
  }

  /**
   * Envoie au l'agent tout ce que l'employé a réellement fait sur le lab :
   * commandes exécutées, sorties observées, étapes, critères et constats.
   * L'agent statue : l'unité n'est terminée que si la preuve est validée.
   */
  validate(lab: Lab): void {
    if (!this.canValidate(lab)) {
      return;
    }
    const executedCommands = lab.commands.filter((_, index) => this.executed().includes(index));
    const outputs = this.consoleLines()
      .filter((line) => line.kind === 'ok')
      .map((line) => line.text);
    const observations = Object.entries(this.observations())
      .filter(([key]) => key.startsWith(`${lab.id}:`))
      .map(([, value]) => value)
      .filter((value) => value.trim().length > 0);
    const restitution = this.restitution(lab.id).trim();

    const evidence: StepEvidence = {
      unitId: lab.id,
      format: 'PRACTICAL',
      kind: 'COMMANDES',
      commands: executedCommands,
      outputs,
      steps: lab.steps.map((step, index) => ({
        label: step,
        done: this.isStepChecked(lab, index),
      })),
      criteria: lab.successCriteria.map((criterion, index) => ({
        label: criterion,
        done: this.isCriterionChecked(lab, index),
        /* Pas de constat automatique : seul ce que l’employé a écrit compte
         * comme observation. Les sorties de commande sont déjà transmises
         * séparément comme preuve d’exécution. */
        detail: this.observation(lab.id, index).trim(),
      })),
      narrative: restitution || observations.join('\n'),
      durationMinutes: this.minutesOn(lab.id),
      expectedMinutes: lab.estimatedMinutes,
    };

    const verification = this.verifyStep({
      unitId: lab.id,
      unitTitle: lab.title,
      format: 'PRACTICAL',
      notions: [lab.brief, ...lab.successCriteria],
      evidence,
    });

    if (this.completeValidated(lab.id, lab.estimatedMinutes, verification)) {
      this.resetLabState();
    }
  }

  private resetLabState(): void {
    this.executed.set([]);
    this.checked.set([]);
    this.criteriaChecked.set([]);
    this.hintIndex.set(-1);
    this.consoleLines.set([]);
  }

  modeLabel(mode: Lab['validationMode']): string {
    if (mode === 'AUTO') {
      return 'automatique (commandes exécutées)';
    }
    if (mode === 'HUMAN') {
      return 'par le superviseur';
    }
    return 'par critères observables';
  }

  progressLabel(lab: Lab): string {
    if (lab.validationMode === 'AUTO') {
      return `${this.executed().length} / ${lab.commands.length} commandes exécutées`;
    }
    return `${this.criteriaChecked().length} / ${lab.successCriteria.length} critères cochés`;
  }

  private consoleOutput(index: number): string {
    const outputs = [
      'Étape exécutée avec succès. Artefact produit et vérifié.',
      'Succès : la configuration est appliquée et reproductible.',
      'Terminé. Le résultat correspond à la sortie attendue du lab.',
      'Succès : l’état du système est conforme.',
    ];
    return outputs[index % outputs.length];
  }
}
