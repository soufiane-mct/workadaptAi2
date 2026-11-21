import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { CollaborativeProgram, StepEvidence, TeamSprint } from '../../core/models';
import { StepVerdict } from './step-verdict';
import { WorkspaceBase } from './workspace-base';

interface CollaborativeUnitState {
  ratings: Record<string, number>;
  comments: Record<string, string>;
  delivered: boolean;
}

@Component({
  selector: 'wa-collaborative-workspace',
  imports: [StepVerdict],
  template: `
    <div class="coop">
      <section class="ws-panel sprint-bar">
        <h2>Cycle d’équipe</h2>
        <p class="ws-panel__sub">
          {{ units().length }} sprints · vous n’êtes pas seul : chaque livrable dépend d’une
          contribution individuelle vérifiable et d’une revue par les pairs.
        </p>
        <div class="sprint-track">
          @for (unit of units(); track unit.id; let index = $index) {
            <button
              type="button"
              class="sprint"
              [class.sprint--done]="isDone(unit.id)"
              [class.sprint--active]="activeUnit()?.id === unit.id"
              [class.sprint--locked]="isLocked(unit.id)"
              (click)="openSprint(unit.id)"
            >
              <span class="sprint__num">S{{ index + 1 }}</span>
              <span class="sprint__title">{{ unit.title }}</span>
              <span class="sprint__meta">{{ unit.minutes }} min</span>
            </button>
          }
        </div>
      </section>

      @if (sprint(); as current) {
        <div class="coop__columns">
          <main class="ws-main">
            <section class="ws-panel">
              <span class="ws-tag">Sprint {{ current.order }}</span>
              <h2 style="margin-top: 8px">{{ current.title }}</h2>
              <div class="goal">
                <span class="material-symbols-outlined">flag</span>
                <div>
                  <small>Objectif d’équipe</small>
                  <p>{{ current.teamGoal }}</p>
                </div>
              </div>

              <h3 class="sub">Rôles et responsabilités</h3>
              <div class="roles">
                @for (role of current.roles; track role.name) {
                  <div class="role" [class.role--mine]="isMine(role.assignee)">
                    <span class="role__avatar">{{ initials(role.assignee) }}</span>
                    <div class="role__body">
                      <strong>{{ role.name }}</strong>
                      <small>{{ role.assignee }}</small>
                      <p>{{ role.mission }}</p>
                    </div>
                  </div>
                }
              </div>

              <h3 class="sub">Points de synchronisation</h3>
              <ul class="sync">
                @for (checkpoint of current.syncCheckpoints; track checkpoint) {
                  <li><span class="material-symbols-outlined">event</span>{{ checkpoint }}</li>
                }
              </ul>
            </section>

            <section class="ws-panel mine">
              <h2>Votre contribution</h2>
              <p class="ws-panel__sub">{{ current.individualTask }}</p>
              <div class="ws-kv">
                <span>Livrable d’équipe attendu</span>
                <strong>{{ current.deliverable }}</strong>
              </div>
              <label class="wa-field" style="margin-top: 12px">
                <span class="wa-field__label">Décrivez votre contribution et son emplacement</span>
                <textarea
                  class="wa-textarea"
                  rows="3"
                  [value]="contribution(current.id)"
                  [disabled]="!editable() || isDone(current.id)"
                  (input)="setContribution(current.id, $any($event.target).value)"
                  (blur)="saveNotes()"
                  placeholder="Ex. J’ai rédigé la procédure de revue (docs/review.md), animé la revue croisée du 12/03 et corrigé 2 blocages."
                ></textarea>
              </label>
            </section>

            <section class="ws-panel peers">
              <h2>Revue par les pairs</h2>
              <p class="ws-panel__sub">
                Vous évaluez la contribution de deux coéquipiers sur les critères du sprint.
                Vos retours sont conservés et visibles par le superviseur.
              </p>
              @for (peer of peers; track peer.name) {
                <div class="peer">
                  <div class="peer__head">
                    <span class="role__avatar">{{ initials(peer.name) }}</span>
                    <div>
                      <strong>{{ peer.name }}</strong>
                      <small>{{ peer.role }}</small>
                    </div>
                    <span class="peer__stars">
                      @for (star of [1, 2, 3, 4, 5]; track star) {
                        <button
                          type="button"
                          class="star"
                          [class.star--on]="rating(current.id, peer.name) >= star"
                          [disabled]="!editable() || isDone(current.id)"
                          (click)="setRating(current.id, peer.name, star)"
                          [attr.aria-label]="star + ' sur 5'"
                        >★</button>
                      }
                    </span>
                  </div>
                  <input
                    class="wa-input"
                    [value]="peerComment(current.id, peer.name)"
                    [disabled]="!editable() || isDone(current.id)"
                    (input)="setPeerComment(current.id, peer.name, $any($event.target).value)"
                    placeholder="Un point fort concret et une piste d’amélioration."
                  />
                </div>
              )}
              <ul class="criteria">
                @for (criterion of current.peerReviewCriteria; track criterion) {
                  <li>{{ criterion }}</li>
                }
              </ul>
            </section>
          </main>

          <aside class="ws-panel validation">
            <h2>Validation du sprint</h2>
            <p class="ws-panel__sub">
              Le sprint ne se termine que si la contribution est décrite, les deux revues sont
              complètes et le livrable d’équipe est déposé.
            </p>
            <div class="checks">
              <label class="ws-check">
                <input type="checkbox" [checked]="contributionOk(current)" disabled />
                <span>Contribution individuelle décrite</span>
              </label>
              <label class="ws-check">
                <input type="checkbox" [checked]="reviewsDone(current)" disabled />
                <span>Deux revues par les pairs complétées</span>
              </label>
              <label class="ws-check">
                <input
                  type="checkbox"
                  [checked]="teamDelivered(current.id)"
                  [disabled]="!editable() || isDone(current.id)"
                  (change)="toggleTeamDelivered(current.id)"
                />
                <span>Le livrable d’équipe est déposé sur le dépôt partagé</span>
              </label>
            </div>
            <button
              class="btn btn--primary"
              type="button"
              style="width: 100%; margin-top: 8px"
              [disabled]="!canClose(current)"
              (click)="close(current)"
            >
              <span class="material-symbols-outlined">fact_check</span>
              {{ isDone(current.id) ? 'Sprint clôturé' : 'Faire vérifier par l’agent' }}
            </button>
            <p class="wa-small wa-muted" style="margin: 10px 0 0">
              Les revues ne sont pas anonymes : elles engagent leur auteur.
            </p>

            <wa-step-verdict [verification]="verification()" />
          </aside>
        </div>
      }

      <section class="ws-panel final">
        <span class="ws-tag">Livrable d’équipe</span>
        <h2 style="margin-top: 8px">{{ cp().teamDeliverable.title }}</h2>
        <ul class="criteria">
          @for (item of cp().teamDeliverable.acceptance; track item) {
            <li>{{ item }}</li>
          }
        </ul>
        <div class="ws-kv">
          <span>Preuve de contribution exigée</span>
          <strong>{{ cp().teamDeliverable.contributionProof }}</strong>
        </div>
      </section>
    </div>
  `,
  styleUrl: './workspace.scss',
  styles: [
    `
      .coop {
        display: flex;
        flex-direction: column;
        gap: 18px;
      }
      .sprint-track {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 8px;
        margin-top: 14px;
      }
      .sprint {
        text-align: left;
        padding: 11px 12px;
        border-radius: 11px;
        border: 1px solid var(--wa-border);
        background: var(--wa-surface-2);
        cursor: pointer;
        display: flex;
        flex-direction: column;
        gap: 3px;
      }
      .sprint__num {
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.08em;
        color: var(--wa-ink-faint);
      }
      .sprint__title {
        font-size: 12.5px;
        font-weight: 600;
        line-height: 1.35;
      }
      .sprint__meta {
        font-size: 10.5px;
        color: var(--wa-ink-soft);
      }
      .sprint--active {
        border-color: #475569;
        background: #eef1f6;
        box-shadow: 0 0 0 3px rgba(71, 85, 105, 0.12);
      }
      .sprint--done {
        background: var(--wa-success-soft);
        border-color: #9fdbc0;
      }
      .sprint--locked {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .coop__columns {
        display: grid;
        grid-template-columns: minmax(0, 1.5fr) 300px;
        gap: 18px;
        align-items: start;
      }
      .goal {
        display: flex;
        gap: 10px;
        padding: 12px 14px;
        border-radius: 11px;
        background: #eef1f6;
        margin-bottom: 6px;
      }
      .goal .material-symbols-outlined {
        color: #475569;
      }
      .goal small {
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: var(--wa-ink-faint);
        font-weight: 700;
      }
      .goal p {
        margin: 2px 0 0;
        font-size: 12.5px;
        line-height: 1.5;
      }
      .sub {
        margin: 18px 0 8px;
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.07em;
        color: var(--wa-ink-faint);
      }
      .roles {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
      }
      .role {
        display: flex;
        gap: 9px;
        padding: 10px 11px;
        border-radius: 10px;
        background: var(--wa-surface-2);
        border: 1px solid transparent;
      }
      .role--mine {
        border-color: #94a3b8;
        background: #f4f6fa;
      }
      .role__avatar {
        flex: none;
        width: 30px;
        height: 30px;
        border-radius: 9px;
        display: grid;
        place-items: center;
        background: #e2e8f0;
        color: #334155;
        font-size: 11px;
        font-weight: 700;
      }
      .role__body strong {
        font-size: 12.5px;
      }
      .role__body small {
        display: block;
        font-size: 10.5px;
        color: var(--wa-ink-soft);
      }
      .role__body p {
        margin: 4px 0 0;
        font-size: 11.5px;
        line-height: 1.45;
        color: var(--wa-ink-soft);
      }
      .sync {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .sync li {
        display: flex;
        align-items: center;
        gap: 7px;
        font-size: 12.5px;
      }
      .sync .material-symbols-outlined {
        font-size: 16px;
        color: #475569;
      }
      .mine {
        border-left: 4px solid #475569;
      }
      .peer {
        padding: 11px 12px;
        border-radius: 11px;
        border: 1px solid var(--wa-border);
        margin-bottom: 8px;
      }
      .peer__head {
        display: flex;
        align-items: center;
        gap: 9px;
        margin-bottom: 8px;
      }
      .peer__head small {
        display: block;
        font-size: 10.5px;
        color: var(--wa-ink-soft);
      }
      .peer__stars {
        margin-left: auto;
        display: flex;
        gap: 2px;
      }
      .star {
        border: none;
        background: transparent;
        color: #cbd5e1;
        font-size: 17px;
        cursor: pointer;
        padding: 0 1px;
      }
      .star--on {
        color: #f59e0b;
      }
      .criteria {
        margin: 10px 0 0;
        padding-left: 18px;
        font-size: 12px;
        line-height: 1.7;
        color: var(--wa-ink-soft);
      }
      .validation {
        position: sticky;
        top: 88px;
        border-top: 4px solid #475569;
      }
      .checks {
        display: flex;
        flex-direction: column;
        margin-bottom: 8px;
      }
      .final {
        border-left: 4px solid #475569;
      }
      @media (max-width: 1050px) {
        .coop__columns {
          grid-template-columns: 1fr;
        }
        .validation {
          position: static;
        }
      }
      @media (max-width: 720px) {
        .roles {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CollaborativeWorkspace extends WorkspaceBase {
  readonly cp = computed(() => this.program() as CollaborativeProgram);
  readonly sprint = computed(() =>
    this.cp().sprints.find((item) => item.id === this.activeUnit()?.id),
  );

  readonly ratings = signal<Record<string, number>>({});
  readonly comments = signal<Record<string, string>>({});
  readonly delivered = signal<string[]>([]);

  readonly peers = [
    { name: 'Salma Bennani', role: 'Développeuse d’interfaces' },
    { name: 'Youssef Amrani', role: 'Ingénieur plateforme' },
  ];

  protected override restoreUnitState(unitId: string): void {
    const state = this.unitState<CollaborativeUnitState>(unitId);

    this.ratings.update((map) => {
      const next = { ...map };
      for (const peer of this.peers) {
        const key = `${unitId}:${peer.name}`;
        if (state?.ratings[key] !== undefined) {
          next[key] = state.ratings[key];
        } else {
          delete next[key];
        }
      }
      return next;
    });

    this.comments.update((map) => {
      const next = { ...map };
      for (const peer of this.peers) {
        const key = `${unitId}:${peer.name}`;
        if (state?.comments[key] !== undefined) {
          next[key] = state.comments[key];
        } else {
          delete next[key];
        }
      }
      return next;
    });

    this.delivered.update((list) => {
      const without = list.filter((id) => id !== unitId);
      return state?.delivered ? [...without, unitId] : without;
    });

    if (state) {
      return;
    }

    // Relecture d'un format antérieur : contribution et revues étaient
    // enregistrées dans une seule note textuelle.
    const legacy = this.savedNotes(unitId);
    const reviewsMarker = '\n\nRevues :';
    const reviewsIndex = legacy.indexOf(reviewsMarker);
    const contribution =
      reviewsIndex >= 0 ? legacy.slice(0, reviewsIndex).replace(/^Contribution :\s*/, '') : legacy;
    this.notes.set(contribution);
    if (reviewsIndex < 0) {
      return;
    }
    const reviews = legacy.slice(reviewsIndex + reviewsMarker.length);
    for (const peer of this.peers) {
      const line = reviews.split('\n').find((candidate) => candidate.startsWith(`${peer.name} —`));
      const match = line?.match(/ — (\d+)\/5 : (.*)$/);
      if (match) {
        this.ratings.update((map) => ({ ...map, [`${unitId}:${peer.name}`]: Number(match[1]) }));
        this.comments.update((map) => ({ ...map, [`${unitId}:${peer.name}`]: match[2] }));
      }
    }
  }

  openSprint(unitId: string): void {
    this.saveNotes();
    this.select(unitId);
  }

  isMine(assignee: string): boolean {
    return assignee.toLowerCase().includes('vous') || assignee.toLowerCase().includes('soufiane');
  }

  initials(name: string): string {
    return name
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('');
  }

  contribution(sprintId: string): string {
    return sprintId === this.activeUnit()?.id ? this.notes() : this.savedNotes(sprintId);
  }

  setContribution(sprintId: string, value: string): void {
    if (sprintId === this.activeUnit()?.id) {
      this.setNotes(value);
      this.saveCollaborativeState(sprintId);
    }
  }

  contributionOk(sprint: TeamSprint): boolean {
    return this.contribution(sprint.id).trim().length >= 40;
  }

  rating(sprintId: string, peer: string): number {
    return this.ratings()[`${sprintId}:${peer}`] ?? 0;
  }

  setRating(sprintId: string, peer: string, value: number): void {
    this.ratings.update((map) => ({ ...map, [`${sprintId}:${peer}`]: value }));
    this.saveCollaborativeState(sprintId);
  }

  peerComment(sprintId: string, peer: string): string {
    return this.comments()[`${sprintId}:${peer}`] ?? '';
  }

  setPeerComment(sprintId: string, peer: string, value: string): void {
    this.comments.update((map) => ({ ...map, [`${sprintId}:${peer}`]: value }));
    this.saveCollaborativeState(sprintId);
  }

  reviewsDone(sprint: TeamSprint): boolean {
    return this.peers.every(
      (peer) =>
        this.rating(sprint.id, peer.name) > 0 &&
        this.peerComment(sprint.id, peer.name).trim().length >= 15,
    );
  }

  teamDelivered(sprintId: string): boolean {
    return this.delivered().includes(sprintId);
  }

  toggleTeamDelivered(sprintId: string): void {
    this.delivered.update((list) =>
      list.includes(sprintId) ? list.filter((id) => id !== sprintId) : [...list, sprintId],
    );
    this.saveCollaborativeState(sprintId);
  }

  private saveCollaborativeState(sprintId: string): void {
    const ratings = Object.fromEntries(
      this.peers.map((peer) => [`${sprintId}:${peer.name}`, this.rating(sprintId, peer.name)]),
    );
    const comments = Object.fromEntries(
      this.peers.map((peer) => [`${sprintId}:${peer.name}`, this.peerComment(sprintId, peer.name)]),
    );
    this.saveUnitState(
      sprintId,
      {
        ratings,
        comments,
        delivered: this.teamDelivered(sprintId),
      } satisfies CollaborativeUnitState,
      this.notes(),
    );
  }

  canClose(sprint: TeamSprint): boolean {
    if (!this.editable() || this.isDone(sprint.id)) {
      return false;
    }
    return this.contributionOk(sprint) && this.reviewsDone(sprint) && this.teamDelivered(sprint.id);
  }

  /**
   * Le sprint n’est clôturé que si l’agent valide la trace : contribution
   * individuelle, revues par les pairs et dépôt du livrable d’équipe.
   */
  close(sprint: TeamSprint): void {
    if (!this.canClose(sprint)) {
      return;
    }
    const reviews = this.peers
      .map(
        (peer) =>
          `${peer.name} — ${this.rating(sprint.id, peer.name)}/5 : ${this.peerComment(sprint.id, peer.name)}`,
      )
      .join('\n');
    this.saveCollaborativeState(sprint.id);

    const evidence: StepEvidence = {
      unitId: sprint.id,
      format: 'COLLABORATIVE',
      kind: 'REVUE',
      /* Les points de synchronisation concernent l'équipe : la
       * contribution personnelle est la seule action imputée à l'employé. */
      steps: [
        {
          label: sprint.individualTask,
          done: this.contributionOk(sprint),
          detail: this.contribution(sprint.id),
        },
      ],
      decisions: sprint.roles
        .filter((role) => this.isMine(role.assignee))
        .map((role) => ({
          label: `Rôle « ${role.name} » : ${role.mission}`,
          done: this.contributionOk(sprint),
          detail: this.contribution(sprint.id),
        })),
      criteria: sprint.peerReviewCriteria.map((criterion) => ({
        label: criterion,
        done: this.reviewsDone(sprint),
        detail: reviews,
      })),
      narrative: `Contribution individuelle : ${this.contribution(
        sprint.id,
      )}\n\nRevues par les pairs :\n${reviews}\n\nLivrable d’équipe déposé : ${sprint.deliverable}`,
      durationMinutes: this.minutesOn(sprint.id),
      expectedMinutes: sprint.estimatedMinutes,
    };

    const verification = this.verifyStep({
      unitId: sprint.id,
      unitTitle: sprint.title,
      format: 'COLLABORATIVE',
      notions: [sprint.teamGoal, sprint.individualTask, sprint.deliverable],
      evidence,
    });

    this.completeValidated(sprint.id, sprint.estimatedMinutes, verification);
  }
}
