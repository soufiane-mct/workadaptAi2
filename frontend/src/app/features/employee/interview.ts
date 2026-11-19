import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { InterviewDiagnosticResult, InterviewMessage } from '../../core/models';
import { DataService } from '../../core/data/data.service';

interface ScriptStep {
  id: string;
  prompt: string;
  hint: string;
  theme: string;
  keywords: string[];
}

/** État d'un thème de l'entretien. */
type InterviewStepStatus = 'EN_COURS' | 'RELANCE' | 'VALIDE' | 'PASSEE';

const SCRIPT: ScriptStep[] = [
  {
    id: 'daily',
    theme: 'Pratiques quotidiennes',
    prompt:
      'Décrivez une journée type : quelles tâches réalisez-vous seul, et lesquelles nécessitent l’aide d’un collègue ?',
    hint: 'Soyez concret : outils, gestes techniques, points de blocage.',
    keywords: ['conteneur', 'docker', 'pipeline', 'revue', 'test', 'déploiement', 'api', 'base'],
  },
  {
    id: 'recent',
    theme: 'Résolution de problème',
    prompt:
      'Racontez un problème technique récent que vous avez résolu. Quelle était la cause réelle ?',
    hint: 'Structurez : symptôme, hypothèses, vérification, correctif.',
    keywords: ['cause', 'logs', 'hypothèse', 'diagnostic', 'correctif', 'test', 'rollback', 'mesure'],
  },
  {
    id: 'learning',
    theme: 'Apprentissage',
    prompt:
      'Comment apprenez-vous une nouvelle technologie ? Donnez un exemple récent et ce qui a réellement changé dans votre pratique.',
    hint: 'La réponse doit mentionner une pratique, pas seulement une lecture.',
    keywords: ['projet', 'exercice', 'documentation', 'lab', 'pratique', 'erreur', 'mentor', 'veille'],
  },
  {
    id: 'collaboration',
    theme: 'Collaboration',
    prompt:
      'Comment vos choix techniques sont-ils revus par les autres ? Donnez un désaccord concret et sa résolution.',
    hint: 'Un désaccord réel vaut mieux qu’une réponse idéalisée.',
    keywords: ['revue', 'pair', 'désaccord', 'argument', 'décision', 'équipe', 'documentation', 'arbitrage'],
  },
  {
    id: 'target',
    theme: 'Objectif professionnel',
    prompt:
      'Quelle compétence voulez-vous maîtriser dans les six prochains mois, et à quoi verra-t-on que c’est acquis ?',
    hint: 'Un objectif sans preuve observable ne peut pas être évalué.',
    keywords: ['objectif', 'preuve', 'mesure', 'production', 'autonomie', 'référent', 'qualité'],
  },
];

@Component({
  selector: 'wa-interview-page',
  imports: [RouterLink],
  styleUrl: '../pages.scss',
  template: `
    <div class="page">
      <header class="page-head">
        <div>
          <h1>Entretien de diagnostic</h1>
          <p>
            Cet entretien complète la collecte technique. L’IA ne note pas votre personnalité :
            elle cherche des faits vérifiables et repère les zones à confirmer par évaluation.
            Vos réponses restent déclaratives jusqu’à preuve.
          </p>
        </div>
        <div class="page-head__actions">
          @if (finished()) {
            <button class="btn" type="button" (click)="restart()">
              <span class="material-symbols-outlined">restart_alt</span>
              Refaire l’entretien
            </button>
          } @else {
            <span class="wa-chip wa-chip--info">{{ answeredCount() }} / {{ script.length }} réponses</span>
          }
        </div>
      </header>

      @if (result(); as diagnostic) {
        <section class="panel">
          <div class="diag">
            <div class="diag__score">
              <strong>{{ diagnostic.globalScore }}</strong>
              <small>/100</small>
            </div>
            <div class="diag__body">
              <h2>Diagnostic conversationnel</h2>
              <p class="panel__sub" style="margin-bottom: 0">
                Score global {{ diagnostic.globalScore }}/100 · scénario {{ diagnostic.scenarioScore }}
                · pratique {{ diagnostic.quizScore }}. Ce score est une estimation : seule une
                évaluation peut le confirmer.
              </p>
            </div>
          </div>

          <div class="split--even" style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 16px">
            <div>
              <h3 class="sub">Points d’appui</h3>
              <ul class="bullets">
                @for (item of diagnostic.strengths; track item) {
                  <li>{{ item }}</li>
                }
              </ul>
            </div>
            <div>
              <h3 class="sub">Points de vigilance</h3>
              <ul class="bullets">
                @for (item of diagnostic.watchpoints; track item) {
                  <li>{{ item }}</li>
                }
              </ul>
            </div>
          </div>

          <h3 class="sub">Actions proposées</h3>
          <div class="list">
            @for (action of diagnostic.actions; track action.title) {
              <a class="row" [routerLink]="action.link">
                <span class="icon-round material-symbols-outlined">arrow_forward</span>
                <div class="row__main">
                  <strong>{{ action.title }}</strong>
                  <p>{{ action.description }}</p>
                </div>
                <span class="wa-chip wa-chip--info">{{ action.action }}</span>
              </a>
            }
          </div>
        </section>
      }

      <div class="split">
        <section class="panel chat-panel">
          <div class="chat">
            <div class="bubble bubble--ai">
              <span class="bubble__who">Agent d’entretien</span>
              <p>
                Bonjour {{ firstName() }}. Je vais vous poser {{ script.length }} questions sur
                vos pratiques réelles. Répondez avec des exemples concrets : je relance dès qu’une
                réponse reste vague.
              </p>
            </div>
            @for (message of messages(); track message.id) {
              <div class="bubble" [class.bubble--me]="message.author === 'USER'">
                <span class="bubble__who">{{ message.author === 'AI' ? 'Agent d’entretien' : 'Vous' }}</span>
                <p>{{ message.text }}</p>
              </div>
            }
            @if (typing()) {
              <div class="bubble bubble--ai">
                <span class="bubble__who">Agent d’entretien</span>
                <p class="dots"><i></i><i></i><i></i></p>
              </div>
            }
          </div>

          @if (!finished()) {
            <div class="composer">
              <div class="composer__head">
                <span class="wa-chip wa-chip--neutral">{{ current().theme }}</span>
                <span class="wa-small wa-muted">{{ current().hint }}</span>
              </div>
              @if (statusOf(current().id) === 'RELANCE') {
                <p class="note" style="margin: 0 0 9px">
                  <span class="material-symbols-outlined">replay</span>
                  Relance {{ relanceCount(current().id) }} / {{ maxRelances }} : votre réponse doit
                  être plus concrète (outil utilisé, action réalisée, résultat mesuré).
                </p>
              }
              <textarea
                class="wa-textarea"
                rows="4"
                [value]="draft()"
                (input)="draft.set($any($event.target).value)"
                [placeholder]="current().prompt"
              ></textarea>
              <div class="composer__foot">
                <span class="wa-small" [class.wa-muted]="draft().trim().length < 40">
                  {{ draft().trim().length }} caractères — 40 minimum pour être exploitable
                </span>
                <div class="composer__actions">
                  <button class="btn btn--small" type="button" (click)="skip()">
                    <span class="material-symbols-outlined">skip_next</span>
                    Passer cette question
                  </button>
                  <button class="btn btn--primary" type="button" [disabled]="draft().trim().length < 40" (click)="send()">
                    <span class="material-symbols-outlined">send</span>
                    Répondre
                  </button>
                </div>
              </div>
            </div>
          } @else {
            <div class="composer">
              <p class="note note--ok" style="margin: 0">
                Entretien terminé. Les réponses sont conservées comme données déclarées et
                orientent le diagnostic, sans jamais créer de preuve de maîtrise.
              </p>
            </div>
          }
        </section>

        <div style="display: flex; flex-direction: column; gap: 18px">
          <section class="panel">
            <h2>Fil de l’entretien</h2>
            <p class="panel__sub">
              Chaque thème est exploré une fois. Une relance ne bloque jamais l’entretien : au
              troisième essai, la réponse est retenue telle quelle et signalée comme déclarative.
            </p>
            <div class="thread">
              @for (step of script; track step.id; let i = $index) {
                <div
                  class="thread__item"
                  [class.thread__item--done]="statusOf(step.id) === 'VALIDE'"
                  [class.thread__item--active]="i === index() && !finished()"
                  [class.thread__item--skipped]="statusOf(step.id) === 'PASSEE'"
                >
                  <span class="thread__num">{{ threadMark(step.id, i) }}</span>
                  <span>{{ step.theme }}</span>
                  @if (statusOf(step.id) === 'RELANCE') {
                    <span class="thread__flag">relance</span>
                  }
                </div>
              }
            </div>
            <p class="wa-small wa-muted" style="margin: 10px 0 0">
              ✓ réponse exploitée · — question passée · reste en cours
            </p>
          </section>

          <section class="panel">
            <h2>Ce que l’entretien ne fait pas</h2>
            <ul class="bullets">
              <li>Il ne modifie pas directement vos niveaux de compétence.</li>
              <li>Il ne remplace pas une évaluation : il produit seulement une hypothèse.</li>
              <li>Il ne transmet rien au superviseur sans votre consentement de partage.</li>
            </ul>
            <a class="btn btn--small" routerLink="/app/collecte" style="margin-top: 10px">
              <span class="material-symbols-outlined">sensors</span>
              Voir la collecte
            </a>
          </section>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .chat-panel {
        padding: 0;
        overflow: hidden;
      }
      .chat {
        display: flex;
        flex-direction: column;
        gap: 11px;
        padding: 18px;
        max-height: 420px;
        overflow-y: auto;
        background: linear-gradient(180deg, #f8f9fd, #fff);
      }
      .bubble {
        align-self: flex-end;
        max-width: 82%;
        padding: 10px 13px;
        border-radius: 13px 13px 4px 13px;
        background: var(--wa-primary-soft);
      }
      .bubble--ai {
        align-self: flex-start;
        border-radius: 13px 13px 13px 4px;
        background: #eef1f6;
      }
      .bubble__who {
        display: block;
        font-size: 9.5px;
        text-transform: uppercase;
        letter-spacing: 0.07em;
        font-weight: 700;
        color: var(--wa-ink-faint);
        margin-bottom: 3px;
      }
      .bubble p {
        margin: 0;
        font-size: 12.5px;
        line-height: 1.55;
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
        background: var(--wa-primary);
        animation: blink 1.1s infinite;
      }
      .dots i:nth-child(2) {
        animation-delay: 0.16s;
      }
      .dots i:nth-child(3) {
        animation-delay: 0.32s;
      }
      @keyframes blink {
        50% {
          opacity: 0.25;
        }
      }
      .composer {
        padding: 14px 16px;
        border-top: 1px solid var(--wa-border);
        background: #fff;
      }
      .composer__head {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
        margin-bottom: 8px;
      }
      .composer__foot {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 10px;
        margin-top: 8px;
        flex-wrap: wrap;
      }
      .composer__actions {
        display: flex;
        gap: 8px;
        align-items: center;
        flex-wrap: wrap;
      }
      .thread {
        display: flex;
        flex-direction: column;
        gap: 5px;
      }
      .thread__item {
        display: flex;
        gap: 9px;
        align-items: center;
        padding: 7px 9px;
        border-radius: 9px;
        border: 1px solid transparent;
        background: var(--wa-surface-2);
        font-size: 12px;
      }
      .thread__item--active {
        border-color: var(--wa-primary);
        background: var(--wa-primary-soft);
      }
      .thread__item--done {
        color: var(--wa-ink-soft);
      }
      .thread__item--skipped {
        opacity: 0.65;
      }
      .thread__flag {
        margin-left: auto;
        font-size: 9.5px;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        font-weight: 700;
        color: #8a5800;
      }
      .thread__num {
        width: 21px;
        height: 21px;
        flex: none;
        border-radius: 6px;
        background: #e2e8f0;
        display: grid;
        place-items: center;
        font-size: 10px;
        font-weight: 700;
      }
      .thread__item--done .thread__num {
        background: var(--wa-success);
        color: #fff;
      }
      .bullets {
        margin: 0;
        padding-left: 18px;
        font-size: 12.5px;
        line-height: 1.65;
        color: var(--wa-ink-soft);
      }
      .diag {
        display: flex;
        gap: 18px;
        align-items: center;
        flex-wrap: wrap;
      }
      .diag__score {
        display: flex;
        align-items: baseline;
        gap: 3px;
        padding: 14px 20px;
        border-radius: 14px;
        background: var(--wa-primary-soft);
        color: var(--wa-primary-deep);
      }
      .diag__score strong {
        font-size: 32px;
        letter-spacing: -0.03em;
      }
      .diag__score small {
        font-size: 11px;
      }
      .diag__body {
        flex: 1;
        min-width: 220px;
      }
      @media (max-width: 900px) {
        .split--even {
          grid-template-columns: 1fr !important;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterviewPage {
  private readonly data = inject(DataService);

  readonly script = SCRIPT;
  readonly firstName = computed(() => this.data.profile().firstName);

  /** Nombre maximal de relances avant d'accepter la réponse telle quelle. */
  readonly maxRelances = 2;

  readonly messages = signal<InterviewMessage[]>([this.aiMessage(SCRIPT[0].prompt)]);
  readonly draft = signal('');
  readonly index = signal(0);
  readonly typing = signal(false);
  readonly finished = signal(false);
  /** Réponses **acceptées** : seules celles-ci alimentent le diagnostic. */
  readonly answers = signal<Record<string, string>>({});
  /** Statut de chaque thème : en cours, relancé, validé ou passé. */
  readonly statuses = signal<Record<string, InterviewStepStatus>>({});
  /** Nombre de relances déjà adressées, par thème. */
  readonly relances = signal<Record<string, number>>({});
  readonly result = signal<InterviewDiagnosticResult | undefined>(undefined);

  readonly current = computed(() => this.script[Math.min(this.index(), this.script.length - 1)]);

  readonly answeredCount = computed(() => Object.keys(this.answers()).length);
  readonly skippedCount = computed(
    () => Object.values(this.statuses()).filter((status) => status === 'PASSEE').length,
  );

  statusOf(stepId: string): InterviewStepStatus {
    return this.statuses()[stepId] ?? 'EN_COURS';
  }

  relanceCount(stepId: string): number {
    return this.relances()[stepId] ?? 0;
  }

  threadMark(stepId: string, index: number): string {
    const status = this.statusOf(stepId);
    if (status === 'VALIDE') {
      return '✓';
    }
    if (status === 'PASSEE') {
      return '—';
    }
    if (status === 'RELANCE') {
      return '!';
    }
    return String(index + 1);
  }

  send(): void {
    const text = this.draft().trim();
    if (text.length < 40) {
      return;
    }
    const step = this.current();
    this.messages.update((list) => [...list, this.userMessage(text)]);
    this.draft.set('');
    this.typing.set(true);

    window.setTimeout(() => {
      this.typing.set(false);
      const coverage = this.coverage(step, text);
      const relances = this.relanceCount(step.id);

      /* ---------------------------------------------------------- *
       * Relance : l'étape reste en cours, la réponse n'est PAS
       * enregistrée. Au bout de maxRelances, la réponse est retenue
       * telle quelle — l'entretien ne peut jamais rester bloqué.
       * ---------------------------------------------------------- */
      if (coverage < 2 && relances < this.maxRelances) {
        this.relances.update((map) => ({ ...map, [step.id]: relances + 1 }));
        this.statuses.update((map) => ({ ...map, [step.id]: 'RELANCE' }));
        const relance = this.aiMessage(
          `Votre réponse reste générale. Précisez un exemple concret, les outils utilisés et ce qui a réellement changé (${step.keywords.slice(0, 3).join(', ')}).`,
        );
        this.messages.update((list) => [...list, relance]);
        return;
      }

      this.answers.update((map) => ({ ...map, [step.id]: text }));
      this.statuses.update((map) => ({ ...map, [step.id]: 'VALIDE' }));

      if (coverage < 2) {
        this.messages.update((list) => [
          ...list,
          this.aiMessage(
            `Je retiens votre réponse sur « ${step.theme} », mais elle reste déclarative : elle sera confirmée par une évaluation, pas par l’entretien.`,
          ),
        ]);
      }

      this.advance();
    }, 520);
  }

  /**
   * Échappatoire : le thème peut être passé sans réponse. L’entretien se
   * poursuit, le diagnostic signalera la zone non couverte.
   */
  skip(): void {
    if (this.finished()) {
      return;
    }
    const step = this.current();
    this.statuses.update((map) => ({ ...map, [step.id]: 'PASSEE' }));
    this.messages.update((list) => [
      ...list,
      this.aiMessage(
        `D’accord, je passe à la suite : « ${step.theme} » restera sans réponse exploitable et sera signalée comme zone à confirmer.`,
      ),
    ]);
    this.draft.set('');
    this.advance();
  }

  /** Passe au thème suivant, ou clôture l’entretien. */
  private advance(): void {
    const next = this.index() + 1;
    if (next >= this.script.length) {
      this.index.set(this.script.length - 1);
      this.finished.set(true);
      this.messages.update((list) => [
        ...list,
        this.aiMessage(
          'Merci. Je clos l’entretien et je produis un diagnostic provisoire. Il devra être confirmé par une évaluation pour compter comme preuve.',
        ),
      ]);
      this.buildDiagnostic();
      return;
    }
    this.index.set(next);
    this.statuses.update((map) => ({ ...map, [this.script[next].id]: 'EN_COURS' }));
    this.messages.update((list) => [...list, this.aiMessage(this.script[next].prompt)]);
  }

  restart(): void {
    this.messages.set([this.aiMessage(SCRIPT[0].prompt)]);
    this.answers.set({});
    this.statuses.set({});
    this.relances.set({});
    this.draft.set('');
    this.index.set(0);
    this.finished.set(false);
    this.result.set(undefined);
  }

  private buildDiagnostic(): void {
    const values = this.answers();
    const perStep = this.script.map((step) => {
      const answer = values[step.id] ?? '';
      const hits = this.coverage(step, answer);
      const lengthScore = Math.min(60, Math.round(answer.trim().length / 4));
      return Math.min(100, 30 + hits * 14 + lengthScore / 2);
    });
    const globalScore = Math.round(perStep.reduce((sum, value) => sum + value, 0) / perStep.length);
    const scenarioScore = Math.round((perStep[1] + perStep[3]) / 2);
    const quizScore = Math.round((perStep[0] + perStep[2] + perStep[4]) / 3);

    const strengths: string[] = [];
    const watchpoints: string[] = [];
    for (const step of this.script) {
      if (this.statusOf(step.id) === 'PASSEE') {
        watchpoints.push(`${step.theme} : question passée sans réponse — zone à confirmer.`);
        continue;
      }
      const hits = this.coverage(step, values[step.id] ?? '');
      if (hits >= 3) {
        strengths.push(`${step.theme} : pratique décrite avec des faits vérifiables.`);
      } else {
        watchpoints.push(`${step.theme} : réponse encore déclarative, à confirmer par une évaluation.`);
      }
    }
    if (strengths.length === 0) {
      strengths.push('Aucun point d’appui suffisamment étayé : le diagnostic reste prudent.');
    }
    if (watchpoints.length === 0) {
      watchpoints.push('Aucune zone de vigilance majeure détectée dans les réponses.');
    }

    this.result.set({
      id: `diag-${Date.now()}`,
      at: new Date().toISOString(),
      quizScore,
      scenarioScore,
      globalScore,
      strengths,
      watchpoints,
      actions: [
        {
          title: 'Vérifier les écarts détectés',
          description:
            'Les écarts reposent sur des déclarations : une évaluation confirmera ou infirmera le niveau réel.',
          link: '/app/ecarts',
          action: 'Ouvrir les écarts',
          tone: 'primary',
        },
        {
          title: 'Compléter la collecte technique',
          description:
            'Les événements du Desktop Collector et des applications connectées restent la source la plus fiable.',
          link: '/app/collecte',
          action: 'Voir la collecte',
          tone: 'success',
        },
      ],
    });
  }

  private coverage(step: ScriptStep, answer: string): number {
    const text = answer.toLowerCase();
    return step.keywords.filter((keyword) => text.includes(keyword.toLowerCase())).length;
  }

  private aiMessage(text: string): InterviewMessage {
    return { id: `msg-${Date.now()}-ai-${Math.random().toString(16).slice(2, 7)}`, author: 'AI', text, at: new Date().toISOString() };
  }

  private userMessage(text: string): InterviewMessage {
    return { id: `msg-${Date.now()}-user-${Math.random().toString(16).slice(2, 7)}`, author: 'USER', text, at: new Date().toISOString() };
  }
}
