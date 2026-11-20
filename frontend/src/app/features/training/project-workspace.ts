import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { Milestone, ProjectProgram, StepEvidence } from '../../core/models';
import { StepVerdict } from './step-verdict';
import { WorkspaceBase } from './workspace-base';

@Component({
  selector: 'wa-project-workspace',
  imports: [StepVerdict],
  template: `
    <div class="project">
      <section class="board">
        <header class="board__head">
          <div>
            <h2>Plan de projet</h2>
            <p class="ws-panel__sub" style="margin: 0">
              {{ units().length }} jalons · {{ pp().estimatedHours }} h · revue finale sur rubrique
            </p>
          </div>
          <div class="board__stats">
            <span class="board__stat">{{ doneCount() }}<small>jalons livrés</small></span>
            <span class="board__stat">{{ pendingReviews() }}<small>en revue</small></span>
          </div>
        </header>

        <div class="rail">
          @for (unit of units(); track unit.id; let index = $index; let last = $last) {
            <div class="rail__item">
              <button
                type="button"
                class="rail__node"
                [class.rail__node--done]="isDone(unit.id)"
                [class.rail__node--active]="activeUnit()?.id === unit.id"
                [class.rail__node--locked]="isLocked(unit.id)"
                (click)="selectMilestone(unit.id)"
                [attr.aria-label]="unit.title"
              >
                {{ isDone(unit.id) ? '✓' : index + 1 }}
              </button>
              @if (!last) {
                <span class="rail__line" [class.rail__line--done]="isDone(unit.id)"></span>
              }
            </div>
          }
        </div>
      </section>

      @if (milestone(); as current) {
        <div class="columns">
          <section class="ws-panel">
            <span class="ws-tag">Jalon {{ current.order }}</span>
            <h2 style="margin-top: 8px">{{ current.title }}</h2>
            <p class="ws-panel__sub">{{ current.brief }}</p>

            <h3 class="sub">Tâches du jalon</h3>
            <div class="tasks">
              @for (task of current.tasks; track task; let index = $index) {
                <label class="task" [class.task--done]="taskDone(current.id).includes(index)">
                  <input
                    type="checkbox"
                    [checked]="taskDone(current.id).includes(index)"
                    [disabled]="!editable() || isDone(current.id)"
                    (change)="toggleTask(current.id, index)"
                  />
                  <span>{{ task }}</span>
                </label>
              }
            </div>

            <h3 class="sub">Critères d’acceptation</h3>
            <ul class="acceptance">
              @for (criterion of current.criteria; track criterion) {
                <li>{{ criterion }}</li>
              }
            </ul>

            <div class="ws-kv">
              <span>Livrable du jalon</span>
              <strong>{{ current.deliverable }}</strong>
            </div>
          </section>

          <section class="ws-panel deposit">
            <h2>Dépôt du livrable</h2>
            <p class="ws-panel__sub">
              Décrivez précisément ce qui a été produit, où le trouver et comment le vérifier.
              Un livrable sans preuve vérifiable est refusé.
            </p>
            <textarea
              class="wa-textarea"
              rows="5"
              [value]="proof(current.id)"
              [disabled]="!editable() || isDone(current.id)"
              (input)="setProof(current.id, $any($event.target).value)"
              placeholder="Ex. Branche feature/pipeline-cache · rapport de run #412 · procédure de rollback dans docs/rollback.md"
            ></textarea>

            <div class="ws-actions">
              <button
                class="btn btn--primary"
                type="button"
                [disabled]="!canDeliver(current)"
                (click)="deliver(current)"
              >
                <span class="material-symbols-outlined">fact_check</span>
                {{ isDone(current.id) ? 'Jalon accepté' : 'Faire vérifier par l’agent' }}
              </button>
              <span class="wa-small wa-muted">{{ reviewLabel(current) }}</span>
            </div>

            <wa-step-verdict [verification]="verification()" />

            @if (isDone(current.id)) {
              <div class="review">
                <span class="material-symbols-outlined">verified</span>
                <div>
                  <strong>Jalon accepté</strong>
                  <small>Livrable conforme aux critères d’acceptation.</small>
                </div>
              </div>
            }
          </section>
        </div>
      }

      <section class="ws-panel final">
        <span class="ws-tag">Revue finale</span>
        <h2 style="margin-top: 8px">Rubrique d’évaluation du projet</h2>
        <div class="rubric">
          @for (item of pp().finalReview.rubric; track item; let index = $index) {
            <div class="rubric__row">
              <span class="rubric__num">{{ index + 1 }}</span>
              <p>{{ item }}</p>
            </div>
          }
        </div>
        <h3 class="sub">Conditions d’acceptation du projet</h3>
        <ul class="acceptance">
          @for (item of pp().finalReview.acceptance; track item) {
            <li>{{ item }}</li>
          }
        </ul>
      </section>
    </div>
  `,
  styleUrl: './workspace.scss',
  styles: [
    `
      .project {
        display: flex;
        flex-direction: column;
        gap: 18px;
      }
      .board {
        background: var(--wa-surface);
        border: 1px solid var(--wa-border);
        border-radius: var(--wa-radius);
        box-shadow: var(--wa-shadow-xs);
        padding: 20px 22px;
      }
      .board__head {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 16px;
        flex-wrap: wrap;
      }
      .board__head h2 {
        margin: 0 0 4px;
        font-size: 16px;
      }
      .board__stats {
        display: flex;
        gap: 12px;
      }
      .board__stat {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 8px 16px;
        border-radius: 10px;
        background: var(--wa-warning-soft);
        color: #7a4d00;
        font-size: 18px;
        font-weight: 700;
      }
      .board__stat small {
        font-size: 10px;
        font-weight: 600;
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }
      .rail {
        display: flex;
        align-items: center;
        margin-top: 20px;
        padding: 0 6px;
      }
      .rail__item {
        flex: 1;
        display: flex;
        align-items: center;
      }
      .rail__item:last-child {
        flex: none;
      }
      .rail__node {
        width: 36px;
        height: 36px;
        flex: none;
        border-radius: 10px;
        border: 1.5px solid var(--wa-border-strong);
        background: #fff;
        color: var(--wa-ink-soft);
        font-size: 12.5px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.15s ease;
      }
      .rail__node--done {
        background: #0e9f9a;
        border-color: #0e9f9a;
        color: #fff;
      }
      .rail__node--active {
        border-color: #b26a00;
        color: #b26a00;
        box-shadow: 0 0 0 4px rgba(178, 106, 0, 0.14);
      }
      .rail__node--locked {
        opacity: 0.45;
        cursor: not-allowed;
      }
      .rail__line {
        flex: 1;
        height: 2px;
        background: var(--wa-border-strong);
        margin: 0 6px;
      }
      .rail__line--done {
        background: #0e9f9a;
      }
      .columns {
        display: grid;
        grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
        gap: 18px;
        align-items: start;
      }
      .sub {
        margin: 18px 0 8px;
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.07em;
        color: var(--wa-ink-faint);
      }
      .tasks {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .task {
        display: flex;
        align-items: flex-start;
        gap: 9px;
        padding: 8px 10px;
        border-radius: 9px;
        background: var(--wa-surface-2);
        font-size: 12.5px;
        line-height: 1.45;
      }
      .task input {
        margin-top: 2px;
      }
      .task--done span {
        text-decoration: line-through;
        color: var(--wa-ink-soft);
      }
      .acceptance {
        margin: 0;
        padding-left: 18px;
        font-size: 12.5px;
        line-height: 1.65;
      }
      .deposit {
        border-top: 4px solid #b26a00;
      }
      .review {
        display: flex;
        gap: 10px;
        align-items: center;
        margin-top: 14px;
        padding: 11px 13px;
        border-radius: 11px;
        background: var(--wa-success-soft);
        color: #0a6b3d;
      }
      .review small {
        display: block;
        font-size: 11px;
      }
      .final {
        border-left: 4px solid #b26a00;
      }
      .rubric {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
      }
      .rubric__row {
        display: flex;
        gap: 9px;
        align-items: flex-start;
        padding: 10px 12px;
        border-radius: 10px;
        background: var(--wa-surface-2);
      }
      .rubric__row p {
        margin: 0;
        font-size: 12.5px;
        line-height: 1.5;
      }
      .rubric__num {
        width: 22px;
        height: 22px;
        flex: none;
        border-radius: 6px;
        background: var(--wa-warning-soft);
        color: #b26a00;
        display: grid;
        place-items: center;
        font-size: 10.5px;
        font-weight: 700;
      }
      @media (max-width: 950px) {
        .columns,
        .rubric {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectWorkspace extends WorkspaceBase {
  readonly pp = computed(() => this.program() as ProjectProgram);
  readonly milestone = computed(() =>
    this.pp().milestones.find((item) => item.id === this.activeUnit()?.id),
  );

  readonly tasks = signal<Record<string, number[]>>({});
  readonly proofs = signal<Record<string, string>>({});
  readonly delivered = signal<string[]>([]);

  /**
   * Jalons livrés moins jalons validés par l'agent. Le compteur ne peut
   * pas être négatif : après relecture, `delivered` est vide alors que les
   * unités sont déjà terminées.
   */
  readonly pendingReviews = computed(
    () =>
      Math.max(
        0,
        this.delivered().length - this.progress().units.filter((unit) => unit.status === 'DONE').length,
      ),
  );

  selectMilestone(unitId: string): void {
    this.select(unitId);
  }

  taskDone(milestoneId: string): number[] {
    return this.tasks()[milestoneId] ?? [];
  }

  toggleTask(milestoneId: string, index: number): void {
    this.tasks.update((map) => {
      const current = map[milestoneId] ?? [];
      return {
        ...map,
        [milestoneId]: current.includes(index)
          ? current.filter((value) => value !== index)
          : [...current, index],
      };
    });
  }

  proof(milestoneId: string): string {
    return this.proofs()[milestoneId] ?? '';
  }

  setProof(milestoneId: string, value: string): void {
    this.proofs.update((map) => ({ ...map, [milestoneId]: value }));
  }

  canDeliver(milestone: Milestone): boolean {
    if (!this.editable() || this.isDone(milestone.id)) {
      return false;
    }
    const allTasks = this.taskDone(milestone.id).length === milestone.tasks.length;
    return allTasks && this.proof(milestone.id).trim().length >= 25;
  }

  /**
   * Le jalon n’est accepté que si l’agent valide le livrable déposé : tâches
   * réalisées, critères couverts et preuve vérifiable.
   */
  deliver(milestone: Milestone): void {
    if (!this.canDeliver(milestone)) {
      return;
    }
    const proof = this.proof(milestone.id);
    this.data.saveTrainingNotes(this.request().id, milestone.id, proof);

    const evidence: StepEvidence = {
      unitId: milestone.id,
      format: 'PROJECT',
      kind: 'TEXTE',
      steps: milestone.tasks.map((task, index) => ({
        label: task,
        done: this.taskDone(milestone.id).includes(index),
      })),
      criteria: milestone.criteria.map((criterion) => ({
        label: criterion,
        done: this.taskDone(milestone.id).length === milestone.tasks.length,
        detail: proof,
      })),
      narrative: proof,
      durationMinutes: this.minutesOn(milestone.id),
      expectedMinutes: milestone.estimatedMinutes,
    };

    const verification = this.verifyStep({
      unitId: milestone.id,
      unitTitle: milestone.title,
      format: 'PROJECT',
      notions: [milestone.brief, milestone.deliverable, ...milestone.criteria],
      evidence,
    });

    // Le temps crédité correspond à la durée de curriculum du jalon : la
    // condition de fin exige la somme des durées unitaires, un crédit
    // partiel rendrait le parcours impossible à terminer.
    if (this.completeValidated(milestone.id, milestone.estimatedMinutes, verification)) {
      this.delivered.update((list) => [...list, milestone.id]);
    }
  }

  reviewLabel(milestone: Milestone): string {
    const tasksDone = this.taskDone(milestone.id).length;
    if (this.proof(milestone.id).trim().length < 25) {
      return 'Preuve de livrable trop courte (25 caractères minimum)';
    }
    return `${tasksDone} / ${milestone.tasks.length} tâches · dépôt en attente de revue`;
  }
}
