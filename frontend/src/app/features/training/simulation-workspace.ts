import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import {
  SimulationDecision,
  SimulationProgram,
  SimulationScenario,
  StepEvidence,
} from '../../core/models';
import { StepVerdict } from './step-verdict';
import { WorkspaceBase } from './workspace-base';

@Component({
  selector: 'wa-simulation-workspace',
  imports: [StepVerdict],
  template: `
    <div class="sim">
      <aside class="ws-panel sim__side">
        <h2>Salle d’incidents</h2>
        <p class="ws-panel__sub">Statut des scénarios · journal conservé</p>
        <div class="ws-list">
          @for (unit of units(); track unit.id; let index = $index) {
            <button
              type="button"
              class="ws-unit"
              [class.ws-unit--active]="activeUnit()?.id === unit.id"
              [class.ws-unit--done]="isDone(unit.id)"
              [class.ws-unit--locked]="isLocked(unit.id)"
              (click)="openScenario(unit.id)"
            >
              <span class="ws-unit__index">{{ isDone(unit.id) ? '✓' : index + 1 }}</span>
              <span class="ws-unit__title">
                {{ unit.title }}
                <span class="ws-unit__kind">{{ unit.minutes }} min · {{ scenarioFor(unit.id)?.decisions.length }} décisions</span>
              </span>
            </button>
          }
        </div>
        <div class="score">
          <small>Qualité des décisions</small>
          <strong>{{ decisionScore() }} / 100</strong>
          <div class="score__bar"><span [style.width.%]="decisionScore()"></span></div>
          <small class="wa-muted">Calculé sur les choix réellement effectués, pas sur le hasard.</small>
        </div>
      </aside>

      @if (scenario(); as current) {
        <main class="ws-main">
          <section class="incident">
            <div class="incident__bar">
              <span class="live"><i></i> Simulation en cours</span>
              <span>{{ current.title }}</span>
            </div>
            <h2>{{ current.situation }}</h2>
            <div class="signals">
              @for (signal of current.signals; track signal) {
                <span class="signal">{{ signal }}</span>
              }
            </div>
          </section>

          <section class="ws-panel">
            <h2>Console de production</h2>
            <p class="ws-panel__sub">Ce que le système affiche au moment où vous décidez.</p>
            <div class="terminal">
              @for (line of consoleLines(); track $index) {
                <div class="terminal__line">
                  <span class="terminal__ts">{{ line.time }}</span>
                  <code>{{ line.text }}</code>
                </div>
              }
            </div>
          </section>

          <section class="ws-panel">
            <h2>Décisions</h2>
            <p class="ws-panel__sub">Chaque choix a une conséquence immédiate et un coût.</p>
            <div class="decisions">
              @for (decision of current.decisions; track decision.id; let dIndex = $index) {
                <article class="decision" [class.decision--answered]="answerFor(decision)">
                  <header>
                    <span class="decision__num">D{{ dIndex + 1 }}</span>
                    <p>{{ decision.prompt }}</p>
                  </header>
                  <div class="decision__options">
                    @for (option of decision.options; track option.label; let oIndex = $index) {
                      <button
                        type="button"
                        class="choice"
                        [class.choice--picked]="answerFor(decision)?.label === option.label"
                        [disabled]="!editable() || !!answerFor(decision) || isDone(current.id)"
                        (click)="choose(current.id, decision.id, oIndex)"
                      >
                        <span class="choice__mark">{{ letter(oIndex) }}</span>
                        {{ option.label }}
                      </button>
                    }
                  </div>
                  @if (answerFor(decision); as answer) {
                    <div
                      class="consequence"
                      [class.consequence--good]="answer.score >= 70"
                      [class.consequence--bad]="answer.score < 70"
                    >
                      <strong>{{ answer.score >= 70 ? 'Décision pertinente' : 'Décision coûteuse' }} · {{ answer.outcome }}</strong>
                      <p>{{ answer.feedback }}</p>
                    </div>
                  }
                </article>
              }
            </div>
          </section>

          <section class="ws-panel debrief">
            <h2>Débrief obligatoire</h2>
            <p class="ws-panel__sub">
              Répondez aux questions de débrief. Ce texte est joint au journal de décisions.
            </p>
            @for (question of current.debriefQuestions; track question; let index = $index) {
              <label class="wa-field">
                <span class="wa-field__label">{{ index + 1 }}. {{ question }}</span>
                <textarea
                  class="wa-textarea"
                  rows="2"
                  [value]="debrief(current.id)[index] ?? ''"
                  [disabled]="!editable() || isDone(current.id)"
                  (input)="setDebrief(current.id, index, $any($event.target).value)"
                ></textarea>
              </label>
            }

            <div class="ws-actions">
              <button
                class="btn btn--primary"
                type="button"
                [disabled]="!canClose(current)"
                (click)="close(current)"
              >
                <span class="material-symbols-outlined">fact_check</span>
                {{ isDone(current.id) ? 'Scénario clôturé' : 'Faire vérifier par l’agent' }}
              </button>
              <span class="wa-small wa-muted">{{ answeredCount(current) }} / {{ current.decisions.length }} décisions</span>
            </div>

            <wa-step-verdict [verification]="verification()" />
          </section>

          <section class="ws-panel report">
            <span class="ws-tag">Post-mortem</span>
            <h2 style="margin-top: 8px">{{ sp().incidentReport.title }}</h2>
            <ul class="report__sections">
              @for (section of sp().incidentReport.sections; track section) {
                <li>{{ section }}</li>
              }
            </ul>
          </section>
        </main>
      }
    </div>
  `,
  styleUrl: './workspace.scss',
  styles: [
    `
      .sim {
        display: grid;
        grid-template-columns: 300px minmax(0, 1fr);
        gap: 18px;
        align-items: start;
      }
      .sim__side {
        position: sticky;
        top: 88px;
      }
      .score {
        margin-top: 16px;
        padding-top: 14px;
        border-top: 1px dashed var(--wa-border);
        display: flex;
        flex-direction: column;
        gap: 5px;
      }
      .score small {
        font-size: 10.5px;
        color: var(--wa-ink-soft);
      }
      .score strong {
        font-size: 20px;
      }
      .score__bar {
        height: 6px;
        border-radius: 999px;
        background: var(--wa-surface-3);
        overflow: hidden;
      }
      .score__bar span {
        display: block;
        height: 100%;
        background: #c2417a;
      }
      .incident {
        border-radius: var(--wa-radius);
        background: linear-gradient(150deg, #2a0f1d, #4a1730);
        color: #fff;
        padding: 20px 22px;
        box-shadow: var(--wa-shadow);
      }
      .incident__bar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 11px;
        color: rgba(255, 255, 255, 0.7);
        margin-bottom: 10px;
      }
      .live {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-weight: 700;
        color: #ffb4cf;
        text-transform: uppercase;
        letter-spacing: 0.07em;
      }
      .live i {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: #ff5c8a;
        animation: pulse 1.4s infinite;
      }
      @keyframes pulse {
        50% {
          opacity: 0.35;
        }
      }
      .incident h2 {
        margin: 0 0 12px;
        font-size: 18px;
        line-height: 1.4;
        max-width: 66ch;
      }
      .signals {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }
      .signal {
        font-size: 10.5px;
        padding: 4px 9px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.14);
        color: #ffd9e5;
      }
      .terminal {
        border-radius: 11px;
        background: #12070d;
        padding: 12px 14px;
        display: flex;
        flex-direction: column;
        gap: 4px;
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        max-height: 210px;
        overflow-y: auto;
      }
      .terminal__line {
        display: flex;
        gap: 10px;
        font-size: 11.5px;
      }
      .terminal__ts {
        color: #7d5b68;
      }
      .terminal__line code {
        color: #d9c2cc;
      }
      .terminal__line:last-child code {
        color: #ff9ec0;
      }
      .decisions {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .decision {
        border: 1px solid var(--wa-border);
        border-radius: 12px;
        padding: 13px 14px;
        background: var(--wa-surface-2);
      }
      .decision--answered {
        background: #fff;
      }
      .decision header {
        display: flex;
        gap: 9px;
        align-items: flex-start;
        margin-bottom: 10px;
      }
      .decision header p {
        margin: 0;
        font-size: 13px;
        font-weight: 600;
        line-height: 1.5;
      }
      .decision__num {
        flex: none;
        width: 28px;
        height: 22px;
        border-radius: 6px;
        display: grid;
        place-items: center;
        background: var(--wa-danger-soft);
        color: #a21c12;
        font-size: 10.5px;
        font-weight: 700;
      }
      .decision__options {
        display: grid;
        gap: 6px;
      }
      .choice {
        display: flex;
        gap: 9px;
        align-items: center;
        text-align: left;
        padding: 9px 11px;
        border-radius: 9px;
        border: 1px solid var(--wa-border);
        background: #fff;
        font-size: 12.5px;
        cursor: pointer;
      }
      .choice__mark {
        flex: none;
        width: 21px;
        height: 21px;
        border-radius: 6px;
        background: var(--wa-surface-3);
        display: grid;
        place-items: center;
        font-size: 10.5px;
        font-weight: 700;
      }
      .choice--picked {
        border-color: #c2417a;
        background: #fdeaf3;
      }
      .consequence {
        margin-top: 10px;
        padding: 10px 12px;
        border-radius: 10px;
        font-size: 12px;
      }
      .consequence strong {
        display: block;
        margin-bottom: 3px;
      }
      .consequence p {
        margin: 0;
        line-height: 1.5;
      }
      .consequence--good {
        background: var(--wa-success-soft);
        color: #0a6b3d;
      }
      .consequence--bad {
        background: var(--wa-danger-soft);
        color: #a21c12;
      }
      .debrief {
        border-left: 4px solid #c2417a;
      }
      .debrief .wa-field {
        margin-bottom: 10px;
      }
      .report {
        border-left: 4px solid #c2417a;
      }
      .report__sections {
        margin: 0;
        padding-left: 18px;
        font-size: 12.5px;
        line-height: 1.7;
      }
      @media (max-width: 1000px) {
        .sim {
          grid-template-columns: 1fr;
        }
        .sim__side {
          position: static;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SimulationWorkspace extends WorkspaceBase {
  readonly sp = computed(() => this.program() as SimulationProgram);
  readonly scenario = computed(() =>
    this.sp().scenarios.find((item) => item.id === this.activeUnit()?.id),
  );

  readonly answers = signal<Record<string, { label: string; outcome: string; score: number; feedback: string }>>({});
  readonly debriefs = signal<Record<string, Record<number, string>>>({});

  readonly consoleLines = computed(() => {
    const current = this.scenario();
    return (current?.consoleLines ?? []).map((text, index) => ({
      time: `14:${String(2 + index * 7).padStart(2, '0')}:${String(11 + index * 3).padStart(2, '0')}`,
      text,
    }));
  });

  readonly decisionScore = computed(() => {
    const values = Object.values(this.answers());
    if (values.length === 0) {
      return 0;
    }
    return Math.round(values.reduce((sum, item) => sum + item.score, 0) / values.length);
  });

  scenarioFor(unitId: string): SimulationScenario | undefined {
    return this.sp().scenarios.find((item) => item.id === unitId);
  }

  openScenario(unitId: string): void {
    this.select(unitId);
    this.verification.set(undefined);
  }

  answerFor(decision: SimulationDecision) {
    return this.answers()[decision.id];
  }

  choose(scenarioId: string, decisionId: string, optionIndex: number): void {
    const scenario = this.scenarioFor(scenarioId);
    const decision = scenario?.decisions.find((item) => item.id === decisionId);
    const option = decision?.options[optionIndex];
    if (!option) {
      return;
    }
    this.answers.update((map) => ({
      ...map,
      [decisionId]: {
        label: option.label,
        outcome: option.outcome,
        score: option.score,
        feedback: option.feedback,
      },
    }));
  }

  debrief(scenarioId: string): Record<number, string> {
    return this.debriefs()[scenarioId] ?? {};
  }

  setDebrief(scenarioId: string, index: number, value: string): void {
    this.debriefs.update((map) => ({
      ...map,
      [scenarioId]: { ...(map[scenarioId] ?? {}), [index]: value },
    }));
  }

  answeredCount(scenario: SimulationScenario): number {
    return scenario.decisions.filter((decision) => this.answers()[decision.id]).length;
  }

  canClose(scenario: SimulationScenario): boolean {
    if (!this.editable() || this.isDone(scenario.id)) {
      return false;
    }
    const allDecisions = this.answeredCount(scenario) === scenario.decisions.length;
    const debriefComplete = scenario.debriefQuestions.every(
      (_, index) => (this.debrief(scenario.id)[index] ?? '').trim().length >= 15,
    );
    return allDecisions && debriefComplete;
  }

  /**
   * Le scénario n’est clôturé que si l’agent valide la trace : décisions
   * prises, conséquences observées et débriefing rédigé.
   */
  close(scenario: SimulationScenario): void {
    if (!this.canClose(scenario)) {
      return;
    }
    const joined = scenario.debriefQuestions
      .map((question, index) => `${question} ${this.debrief(scenario.id)[index] ?? ''}`)
      .join('\n');
    this.data.saveTrainingNotes(this.request().id, scenario.id, joined);

    const evidence: StepEvidence = {
      unitId: scenario.id,
      format: 'SIMULATION',
      kind: 'SCENARIO',
      /* Le journal d'incident est le contexte du scénario, pas une action
       * de l'employé : seules ses décisions et son débriefing comptent. */
      decisions: scenario.decisions.map((decision) => {
        const answer = this.answers()[decision.id];
        return {
          label: decision.prompt,
          done: !!answer,
          detail: answer ? `${answer.label} — ${answer.outcome} (${answer.feedback})` : '',
        };
      }),
      criteria: scenario.signals.map((signal) => ({
        label: signal,
        done: false,
        detail: joined,
      })),
      narrative: joined,
      durationMinutes: this.minutesOn(scenario.id),
      expectedMinutes: scenario.estimatedMinutes,
    };

    const verification = this.verifyStep({
      unitId: scenario.id,
      unitTitle: scenario.title,
      format: 'SIMULATION',
      notions: [scenario.situation, ...scenario.signals],
      evidence,
    });

    this.completeValidated(scenario.id, scenario.estimatedMinutes, verification);
  }

  letter(index: number): string {
    return String.fromCharCode(65 + index);
  }
}
