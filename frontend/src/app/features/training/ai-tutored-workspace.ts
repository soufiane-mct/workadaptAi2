import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { AiTutoredProgram, StepEvidence, TutorSession } from '../../core/models';
import { StepVerdict } from './step-verdict';
import { WorkspaceBase } from './workspace-base';

interface ChatMessage {
  from: 'tutor' | 'me';
  text: string;
}

function normalise(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

@Component({
  selector: 'wa-ai-tutored-workspace',
  imports: [StepVerdict],
  template: `
    <div class="tutor">
      <aside class="ws-panel tutor__side">
        <h2>Sessions de tutorat</h2>
        <p class="ws-panel__sub">{{ units().length }} dialogues socratiques</p>
        <div class="ws-list">
          @for (unit of units(); track unit.id; let index = $index) {
            <button
              type="button"
              class="ws-unit"
              [class.ws-unit--active]="activeUnit()?.id === unit.id"
              [class.ws-unit--done]="isDone(unit.id)"
              [class.ws-unit--locked]="isLocked(unit.id)"
              (click)="openSession(unit.id)"
            >
              <span class="ws-unit__index">{{ isDone(unit.id) ? '✓' : index + 1 }}</span>
              <span class="ws-unit__title">
                {{ unit.title }}
                <span class="ws-unit__kind">{{ unit.minutes }} min · dialogue</span>
              </span>
            </button>
          }
        </div>
        <div class="profile-card">
          <span class="profile-card__avatar material-symbols-outlined">psychology</span>
          <div>
            <strong>Tuteur socratique</strong>
            <small>Il ne donne pas la réponse : il questionne jusqu’à ce que vous la construisiez.</small>
          </div>
        </div>
      </aside>

      @if (session(); as current) {
        <main class="ws-main">
          <section class="ws-panel session-head">
            <div>
              <span class="ws-tag">Session {{ current.order }}</span>
              <h2 style="margin-top: 8px">{{ current.topic }}</h2>
              <p class="ws-panel__sub" style="margin-bottom: 0">{{ current.objective }}</p>
            </div>
            <button class="btn" type="button" (click)="toggleLevels()">
              <span class="material-symbols-outlined">layers</span>
              {{ showLevels() ? 'Masquer les niveaux' : 'Niveaux d’explication' }}
            </button>
          </section>

          @if (showLevels()) {
            <section class="ws-panel levels">
              <h2>Trois niveaux d’explication</h2>
              <p class="ws-panel__sub">Le tuteur reformule si vous bloquez — jamais avant.</p>
              @for (level of current.explanationLevels; track level; let index = $index) {
                <div class="level">
                  <span class="level__num">{{ index + 1 }}</span>
                  <p>{{ level }}</p>
                </div>
              }
            </section>
          }

          <section class="ws-panel chat-panel">
            <div class="chat">
              @for (message of messages(); track $index) {
                <div class="bubble" [class.bubble--me]="message.from === 'me'">
                  <span class="bubble__who">{{ message.from === 'tutor' ? 'Tuteur' : 'Vous' }}</span>
                  <p>{{ message.text }}</p>
                </div>
              }
              @if (typing()) {
                <div class="bubble">
                  <span class="bubble__who">Tuteur</span>
                  <p class="dots"><i></i><i></i><i></i></p>
                </div>
              }
            </div>
            <div class="composer">
              <textarea
                class="wa-textarea"
                rows="2"
                [value]="draft()"
                [disabled]="!editable() || isDone(current.id)"
                (input)="draft.set($any($event.target).value)"
                (keydown.enter)="send($event)"
                placeholder="Expliquez avec vos mots. Une réponse vague déclenchera une relance."
              ></textarea>
              <button class="btn btn--primary" type="button" [disabled]="!canSend()" (click)="send($event)">
                <span class="material-symbols-outlined">send</span>
                Envoyer
              </button>
            </div>
            @if (coverage() < 40) {
              <p class="hint">Relance du tuteur : votre réponse ne couvre pas encore les notions clés. Précisez le mécanisme, pas seulement le résultat.</p>
            }
          </section>

          <section class="ws-panel">
            <h2>Exercice guidé</h2>
            <p class="ws-panel__sub">{{ current.exercise.prompt }}</p>
            <textarea
              class="wa-textarea"
              rows="3"
              [value]="exercise()"
              [disabled]="!editable() || isDone(current.id)"
              (input)="exercise.set($any($event.target).value)"
              placeholder="Votre solution, étape par étape."
            ></textarea>
            <div class="ws-actions" style="margin-top: 10px">
              <button class="btn" type="button" (click)="revealHint()">
                <span class="material-symbols-outlined">lightbulb</span>
                Indice
              </button>
              <span class="wa-small wa-muted">{{ exerciseHints().length }} / {{ current.exercise.hints.length }} indices consultés</span>
            </div>
            @for (hint of exerciseHints(); track hint) {
              <p class="hint">{{ hint }}</p>
            }
            <details class="expected">
              <summary>Comparer à l’attendu</summary>
              <ul>
                @for (item of current.exercise.expected; track item) {
                  <li>{{ item }}</li>
                }
              </ul>
            </details>
          </section>

          <section class="ws-panel teach">
            <h2>Teach-back — preuve de fin de session</h2>
            <p class="ws-panel__sub">
              Expliquez la notion à un collègue qui ne la connaît pas. Le tuteur vérifie que
              toutes les notions clés sont présentes.
            </p>
            <p class="teach__prompt">{{ current.teachBack.prompt }}</p>
            <textarea
              class="wa-textarea"
              rows="4"
              [value]="teachBack()"
              [disabled]="!editable() || isDone(current.id)"
              (input)="teachBack.set($any($event.target).value)"
              placeholder="Expliquez sans jargon inutile, avec un exemple concret."
            ></textarea>
            <div class="keywords">
              @for (keyword of current.teachBack.keywords; track keyword) {
                <span class="keyword" [class.keyword--hit]="hasKeyword(keyword)">{{ keyword }}</span>
              }
            </div>
            <div class="ws-actions">
              <button
                class="btn btn--primary"
                type="button"
                [disabled]="!canFinish(current)"
                (click)="finish(current)"
              >
                <span class="material-symbols-outlined">fact_check</span>
                {{ isDone(current.id) ? 'Session validée' : 'Faire vérifier par l’agent' }}
              </button>
              <span class="wa-small wa-muted">{{ keywordCount() }} / {{ current.teachBack.keywords.length }} notions couvertes</span>
            </div>

            <wa-step-verdict [verification]="verification()" />
          </section>

          <section class="ws-panel final">
            <span class="ws-tag">Dialogue de maîtrise</span>
            <h2 style="margin-top: 8px">{{ ap().masteryDialogue.prompt }}</h2>
            <ul>
              @for (criterion of ap().masteryDialogue.criteria; track criterion) {
                <li>{{ criterion }}</li>
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
      .tutor {
        display: grid;
        grid-template-columns: 300px minmax(0, 1fr);
        gap: 18px;
        align-items: start;
      }
      .tutor__side {
        position: sticky;
        top: 88px;
      }
      .profile-card {
        display: flex;
        gap: 10px;
        margin-top: 16px;
        padding: 12px;
        border-radius: 12px;
        background: #e7f7ef;
      }
      .profile-card__avatar {
        display: grid;
        place-items: center;
        width: 34px;
        height: 34px;
        flex: none;
        border-radius: 9px;
        background: #0f9d58;
        color: #fff;
        font-size: 19px;
      }
      .profile-card strong {
        display: block;
        font-size: 12.5px;
      }
      .profile-card small {
        font-size: 10.5px;
        line-height: 1.45;
        color: #256b48;
      }
      .session-head {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 14px;
        flex-wrap: wrap;
      }
      .levels {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .level {
        display: flex;
        gap: 10px;
        align-items: flex-start;
        padding: 10px 12px;
        border-radius: 10px;
        background: var(--wa-surface-2);
      }
      .level p {
        margin: 0;
        font-size: 12.5px;
        line-height: 1.55;
      }
      .level__num {
        flex: none;
        width: 22px;
        height: 22px;
        border-radius: 6px;
        background: #e7f7ef;
        color: #0f9d58;
        display: grid;
        place-items: center;
        font-size: 10.5px;
        font-weight: 700;
      }
      .chat-panel {
        padding: 0;
        overflow: hidden;
      }
      .chat {
        display: flex;
        flex-direction: column;
        gap: 10px;
        padding: 18px;
        max-height: 380px;
        overflow-y: auto;
        background: linear-gradient(180deg, #f7fbf8, #ffffff);
      }
      .bubble {
        align-self: flex-start;
        max-width: 78%;
        padding: 9px 13px;
        border-radius: 13px 13px 13px 4px;
        background: #e7f7ef;
      }
      .bubble--me {
        align-self: flex-end;
        border-radius: 13px 13px 4px 13px;
        background: var(--wa-primary-soft);
      }
      .bubble__who {
        display: block;
        font-size: 9.5px;
        text-transform: uppercase;
        letter-spacing: 0.07em;
        color: var(--wa-ink-faint);
        margin-bottom: 3px;
        font-weight: 700;
      }
      .bubble p {
        margin: 0;
        font-size: 13px;
        line-height: 1.5;
      }
      .dots {
        display: inline-flex;
        gap: 4px;
        padding: 4px 0;
      }
      .dots i {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #0f9d58;
        animation: blink 1.1s infinite;
      }
      .dots i:nth-child(2) {
        animation-delay: 0.18s;
      }
      .dots i:nth-child(3) {
        animation-delay: 0.36s;
      }
      @keyframes blink {
        50% {
          opacity: 0.25;
        }
      }
      .composer {
        display: flex;
        gap: 10px;
        align-items: flex-end;
        padding: 12px 14px;
        border-top: 1px solid var(--wa-border);
        background: #fff;
      }
      .composer textarea {
        flex: 1;
      }
      .hint {
        margin: 10px 14px 14px;
        padding: 10px 12px;
        border-radius: 10px;
        background: var(--wa-warning-soft);
        color: #7a4d00;
        font-size: 12px;
        line-height: 1.5;
      }
      .expected {
        margin-top: 12px;
        font-size: 12.5px;
      }
      .expected summary {
        cursor: pointer;
        color: var(--wa-primary-deep);
        font-weight: 600;
      }
      .expected ul {
        margin: 8px 0 0;
        padding-left: 18px;
        line-height: 1.65;
      }
      .teach {
        border-left: 4px solid #0f9d58;
      }
      .teach__prompt {
        margin: 0 0 10px;
        padding: 11px 13px;
        border-radius: 11px;
        background: #e7f7ef;
        color: #14532d;
        font-size: 12.5px;
        font-weight: 600;
        line-height: 1.5;
      }
      .keywords {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin: 10px 0;
      }
      .keyword {
        font-size: 11px;
        padding: 4px 9px;
        border-radius: 999px;
        background: var(--wa-surface-3);
        color: var(--wa-ink-soft);
      }
      .keyword--hit {
        background: #e7f7ef;
        color: #0a6b3d;
        font-weight: 600;
      }
      .final {
        border-left: 4px solid #0f9d58;
      }
      .final ul {
        margin: 0;
        padding-left: 18px;
        font-size: 12.5px;
        line-height: 1.7;
      }
      @media (max-width: 1000px) {
        .tutor {
          grid-template-columns: 1fr;
        }
        .tutor__side {
          position: static;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AiTutoredWorkspace extends WorkspaceBase {
  readonly ap = computed(() => this.program() as AiTutoredProgram);
  readonly session = computed(() =>
    this.ap().tutorSessions.find((item) => item.id === this.activeUnit()?.id),
  );

  readonly messages = signal<ChatMessage[]>([]);
  readonly draft = signal('');
  readonly typing = signal(false);
  readonly promptIndex = signal(0);
  readonly showLevels = signal(false);
  readonly exercise = signal('');
  readonly exerciseHints = signal<string[]>([]);
  readonly teachBack = signal('');

  readonly coverage = computed(() => {
    const texts = this.messages()
      .filter((message) => message.from === 'me')
      .map((message) => message.text)
      .join(' ');
    if (texts.length === 0) {
      return 0;
    }
    const keywords = this.session()?.teachBack.keywords ?? [];
    if (keywords.length === 0) {
      return 100;
    }
    return Math.round((this.countKeywords(texts) / keywords.length) * 100);
  });

  readonly keywordCount = computed(() => this.countKeywords(this.teachBack()));

  /**
   * Le dialogue initial est monté en ngOnInit : la session dépend de
   * l'entrée `program`, qui n'est disponible qu'à ce moment.
   */
  override ngOnInit(): void {
    super.ngOnInit();
    this.resetChat();
  }

  openSession(unitId: string): void {
    this.select(unitId);
    this.resetChat();
  }

  toggleLevels(): void {
    this.showLevels.update((value) => !value);
  }

  canSend(): boolean {
    return this.editable() && !this.isDone(this.session()?.id ?? '') && this.draft().trim().length >= 15;
  }

  send(event: Event): void {
    event.preventDefault();
    if (!this.canSend()) {
      return;
    }
    const current = this.session();
    if (!current) {
      return;
    }
    const text = this.draft().trim();
    this.messages.update((messages) => [...messages, { from: 'me', text }]);
    this.draft.set('');
    this.typing.set(true);
    setTimeout(() => {
      this.typing.set(false);
      const next = this.promptIndex() + 1;
      this.promptIndex.set(next);
      const prompt =
        current.socraticPrompts[next % current.socraticPrompts.length] ??
        'Reformulez votre réponse en explicitant le mécanisme, puis donnez un contre-exemple.';
      this.messages.update((messages) => [
        ...messages,
        { from: 'tutor', text: this.reaction(text, prompt) },
      ]);
    }, 420);
  }

  revealHint(): void {
    const hints = this.session()?.exercise.hints ?? [];
    if (this.exerciseHints().length < hints.length) {
      this.exerciseHints.update((list) => [...list, hints[list.length]]);
    }
  }

  hasKeyword(keyword: string): boolean {
    return normalise(this.teachBack()).includes(normalise(keyword).slice(0, 6));
  }

  /**
   * La session n'est validée que si l exchanges, l'exercice et le teach-back
   * sont là : sans cela l'agent ne peut pas vérifier le travail réel.
   */
  canFinish(session: TutorSession): boolean {
    if (!this.editable() || this.isDone(session.id)) {
      return false;
    }
    const covered = session.teachBack.keywords.filter((keyword) => this.hasKeyword(keyword)).length;
    const hasExercise = this.exercise().trim().length >= 30;
    const hasExchange = this.messages().length > 1;
    return (
      hasExercise &&
      hasExchange &&
      this.teachBack().trim().length >= 60 &&
      covered >= Math.ceil(session.teachBack.keywords.length * 0.7)
    );
  }

  /**
   * La session n’est validée que si l’agent valide le teach-back : notions
   * couvertes, exercice réalisé et échange avec le tuteur.
   */
  finish(session: TutorSession): void {
    if (!this.canFinish(session)) {
      return;
    }
    const dialogue = this.messages()
      .map((message) => `${message.from === 'tutor' ? 'Tuteur' : 'Employé'} : ${message.text}`)
      .join('\n');
    this.data.saveTrainingNotes(
      this.request().id,
      session.id,
      `${dialogue}\n\nTeach-back : ${this.teachBack()}`,
    );

    const evidence: StepEvidence = {
      unitId: session.id,
      format: 'AI_TUTORED',
      kind: 'TEXTE',
      steps: [
        {
          label: 'Exercice réalisé',
          done: this.exercise().trim().length >= 30,
          detail: this.exercise(),
        },
        {
          label: 'Notions du teach-back couvertes',
          done: this.keywordCount() === session.teachBack.keywords.length,
          detail: this.teachBack(),
        },
        {
          label: 'Échanges avec le tuteur',
          done: this.messages().length > 1,
          detail: dialogue,
        },
      ],
      criteria: session.teachBack.keywords.map((keyword) => ({
        label: keyword,
        done: this.hasKeyword(keyword),
        detail: this.teachBack(),
      })),
      // La restitution contient le dialogue et le teach-back : l'agent
      // vérifie ce qui a réellement été produit, pas un simple booléen.
      narrative: `${dialogue}\n\nTeach-back : ${this.teachBack()}`,
      durationMinutes: this.minutesOn(session.id),
      expectedMinutes: session.estimatedMinutes,
    };

    const verification = this.verifyStep({
      unitId: session.id,
      unitTitle: session.topic,
      format: 'AI_TUTORED',
      notions: [session.objective, ...session.teachBack.keywords],
      evidence,
    });

    this.completeValidated(session.id, session.estimatedMinutes, verification);
  }

  private resetChat(): void {
    const current = this.session();
    this.messages.set(current ? [{ from: 'tutor', text: current.opening }] : []);
    this.promptIndex.set(0);
    this.draft.set('');
    this.exercise.set('');
    this.exerciseHints.set([]);
    this.teachBack.set('');
    this.showLevels.set(false);
  }

  private reaction(answer: string, prompt: string): string {
    const short = answer.split(/\s+/).length < 12;
    if (short) {
      return `Votre réponse est encore trop brève pour que je puisse juger du raisonnement. ${prompt}`;
    }
    return `Bien. ${prompt}`;
  }

  private countKeywords(value: string): number {
    const keywords = this.session()?.teachBack.keywords ?? [];
    const text = normalise(value);
    return keywords.filter((keyword) => text.includes(normalise(keyword).slice(0, 6))).length;
  }
}
