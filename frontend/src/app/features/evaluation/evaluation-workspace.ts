import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  EVALUATION_METHOD_INFO,
  EVALUATION_METHOD_LABELS,
  EVALUATION_STATUS_LABELS,
  EVALUATION_METHODS,
  EvaluationAnswers,
  EvaluationMethod,
  EvaluationReport,
  FORMAT_LABELS,
} from '../../core/models';
import { DataService } from '../../core/data/data.service';
import { CaseAnalysis } from './case-analysis';
import { DefenseInterview } from './defense-interview';
import { KnowledgeTest } from './knowledge-test';
import { ProfessionalDossier } from './professional-dossier';
import { TechnicalChallenge } from './technical-challenge';

/** Réponses vides : référence stable, évite de recréer un objet à chaque lecture. */
const EMPTY_ANSWERS: EvaluationAnswers = {};

const ACCENTS: Record<EvaluationMethod, { accent: string; soft: string; head: string }> = {
  KNOWLEDGE_TEST: {
    accent: '#2f54eb',
    soft: '#eef2ff',
    head: 'linear-gradient(135deg,#101a33,#1e3a8a)',
  },
  TECHNICAL_CHALLENGE: {
    accent: '#0e9f9a',
    soft: '#e6f7f6',
    head: 'linear-gradient(135deg,#062f2d,#0e6f6a)',
  },
  CASE_ANALYSIS: {
    accent: '#b26a00',
    soft: '#fdf3e2',
    head: 'linear-gradient(135deg,#3b2506,#8a5800)',
  },
  PROFESSIONAL_DOSSIER: {
    accent: '#1f2937',
    soft: '#eef1f6',
    head: 'linear-gradient(135deg,#111827,#374151)',
  },
  DEFENSE_INTERVIEW: {
    accent: '#4f46e5',
    soft: '#eef2ff',
    head: 'linear-gradient(135deg,#1e1b4b,#4338ca)',
  },
};

@Component({
  selector: 'wa-evaluation-workspace',
  imports: [
    RouterLink,
    KnowledgeTest,
    TechnicalChallenge,
    CaseAnalysis,
    ProfessionalDossier,
    DefenseInterview,
  ],
  template: `
    <div
      class="eval"
      [style.--eval-accent]="accent().accent"
      [style.--eval-accent-soft]="accent().soft"
      [style.--eval-head-bg]="accent().head"
    >
      <header class="eval-head">
        <div>
          <a class="eval-badge" routerLink="/app/formations">
            <span class="material-symbols-outlined">arrow_back</span>
            Mes formations
          </a>
          <h1>Évaluation — {{ program()?.title ?? request()?.skillLabel }}</h1>
          <p>
            La méthode se choisit après la fin de la formation, jamais avant. L’IA génère
            l’épreuve à partir du parcours réellement suivi, puis corrige votre copie.
          </p>
          <div class="eval-badges">
            @if (record(); as rec) {
              <span class="eval-badge">
                <span class="material-symbols-outlined">{{ info[rec.method].icon }}</span>
                {{ labels[rec.method] }}
              </span>
              <span class="eval-badge">Tentative {{ rec.attempt }}</span>
            } @else {
              <span class="eval-badge">Méthode à choisir</span>
            }
            @if (program(); as prog) {
              <span class="eval-badge">{{ FORMAT_LABELS[prog.format] }} · {{ prog.estimatedHours }} h</span>
              <span class="eval-badge">Seuil {{ prog.completion.passScore }}/100</span>
            }
          </div>
        </div>
      </header>

      @if (!guard().allowed) {
        <section class="eval-panel">
          <h2>Évaluation indisponible</h2>
          <p class="eval-panel__sub" style="margin-bottom: 10px">{{ guard().reason }}</p>
          <a class="eval-btn" [routerLink]="['/app/formations', requestId()]">
            <span class="material-symbols-outlined">school</span>
            Revenir à la formation
          </a>
        </section>
      } @else if (report(); as rep) {
        <section class="eval-panel">
          <div class="report-score">
            <div class="report-score__value" [style.--p]="rep.score">
              <strong>{{ rep.score }}</strong>
              <small>/ 100</small>
            </div>
            <div class="report-score__text">
              <span class="verdict" [class.verdict--fail]="rep.decision !== 'REUSSI'">
                <span class="material-symbols-outlined">{{ rep.decision === 'REUSSI' ? 'verified' : 'error' }}</span>
                {{ rep.decision === 'REUSSI' ? 'Réussi' : 'Non réussi' }}
              </span>
              <h2 style="margin-top: 6px">
                {{ rep.decision === 'REUSSI' ? 'Maîtrise démontrée' : 'Seuil non atteint' }}
              </h2>
              <p>
                {{ labels[rep.method] }} · score {{ rep.score }}/100 pour un seuil de
                {{ rep.passScore }}. Niveau {{ rep.levelBefore }} → {{ rep.levelAfter }}/100.
              </p>
            </div>
          </div>

          <h3 class="eval-sub">Détail par critère</h3>
          <div class="criteria-table">
            @for (criterion of rep.criteria; track criterion.id) {
              <div class="criterion-row">
                <div class="criterion-row__head">
                  <span>{{ criterion.label }}</span>
                  <span>{{ criterion.earned }} / {{ criterion.max }}</span>
                </div>
                <div class="criterion-row__bar">
                  <span [style.width.%]="percentOf(criterion.earned, criterion.max)"></span>
                </div>
                <p>{{ criterion.comment }}</p>
              </div>
            }
          </div>
        </section>

        <div class="wa-grid wa-grid--2" style="display: grid; grid-template-columns: 1fr 1fr; gap: 18px">
          <section class="eval-panel">
            <h2>Points forts</h2>
            @if (rep.strengths.length === 0) {
              <p class="eval-panel__sub">Aucun critère au-dessus de 80 %.</p>
            }
            <ul class="simple">
              @for (item of rep.strengths; track item) {
                <li>{{ item }}</li>
              }
            </ul>
            <h3 class="eval-sub">À retravailler</h3>
            @if (rep.gaps.length === 0) {
              <p class="eval-panel__sub">Aucun point faible significatif.</p>
            }
            <ul class="simple">
              @for (item of rep.gaps; track item) {
                <li>{{ item }}</li>
              }
            </ul>
          </section>

          <section class="eval-panel">
            <h2>Retour de l’IA</h2>
            <div class="feedback-list">
              @for (item of rep.feedback; track item.notion) {
                <div class="feedback-item">
                  <strong>{{ item.notion }}</strong>
                  <p>{{ item.detail }}</p>
                  <small>{{ item.advice }}</small>
                </div>
              }
              @if (rep.feedback.length === 0) {
                <p class="eval-panel__sub">Aucun commentaire supplémentaire.</p>
              }
            </div>
          </section>
        </div>

        @if (certificate(); as cert) {
          <section class="eval-panel cert">
            <span class="material-symbols-outlined cert__icon">workspace_premium</span>
            <div>
              <h2>Certificat délivré — {{ cert.id }}</h2>
              <p class="eval-panel__sub" style="margin-bottom: 0">
                {{ cert.formationTitle }} · {{ cert.score }}/100 · niveau {{ cert.levelBefore }} →
                {{ cert.levelAfter }}/100. Le résultat a été réinjecté dans la collecte et l’écart
                a été recalculé.
              </p>
            </div>
            <a class="eval-btn eval-btn--primary" [routerLink]="['/app/certificats', cert.id]">
              <span class="material-symbols-outlined">open_in_new</span>
              Voir le certificat
            </a>
          </section>
        } @else {
          <section class="eval-panel failed">
            <h2>Aucun certificat émis</h2>
            <p class="eval-panel__sub" style="margin-bottom: 10px">
              Un certificat n’est délivré qu’après une évaluation réussie. Vous pouvez relire le
              parcours déjà suivi, puis repasser une autre épreuve : la méthode reste votre choix.
            </p>
            <div class="eval-actions">
              <a class="eval-btn" [routerLink]="['/app/formations', requestId()]">
                <span class="material-symbols-outlined">school</span>
                Revoir la formation
              </a>
              @if (rep.decision !== 'REUSSI') {
                <button class="eval-btn eval-btn--primary" type="button" (click)="retry()">
                  <span class="material-symbols-outlined">replay</span>
                  Repasser une autre épreuve
                </button>
              }
              <a class="eval-btn eval-btn--ghost" routerLink="/app/ecarts">
                <span class="material-symbols-outlined">track_changes</span>
                Voir l’écart
              </a>
            </div>
            <p class="wa-small wa-muted" style="margin-top: 10px">
              Tentative {{ attempts() }} effectuée{{ attempts() > 1 ? 's' : '' }} · chaque tentative
              est conservée dans l’historique et réinjectée dans la collecte.
            </p>
          </section>
        }

        <section class="eval-panel">
          <h2>Recommandations pour la suite</h2>
          @for (recommendation of rep.recommendations; track recommendation.title) {
            <div class="feedback-item" style="margin-bottom: 8px">
              <strong>{{ recommendation.title }}</strong>
              <p>{{ recommendation.reason }}</p>
              <small>{{ recommendation.estimatedHours }} h · niveau {{ recommendation.levelFrom }} → {{ recommendation.levelTo }}</small>
            </div>
          }
        </section>
      } @else if (record(); as rec) {
        @if (rec.status === 'PRETE') {
          <section class="eval-panel">
            <span class="eval-tag">Épreuve générée depuis votre parcours</span>
            <h2 style="margin-top: 8px">{{ docTitle(rec) }}</h2>
            <p class="eval-panel__sub">
              Cette épreuve n’est pas un quiz générique : elle reprend les unités, les livrables
              et les notions que vous avez réellement travaillés.
            </p>
            <ol class="simple">
              @for (instruction of docInstructions(rec); track instruction) {
                <li>{{ instruction }}</li>
              }
            </ol>
            <div class="eval-actions" style="margin-top: 14px">
              <button class="eval-btn eval-btn--primary" type="button" (click)="start()">
                <span class="material-symbols-outlined">play_arrow</span>
                Commencer l’épreuve
              </button>
              <span class="wa-small wa-muted">Une fois commencée, l’épreuve doit être remise.</span>
            </div>
          </section>
        } @else if (rec.status === 'EN_COURS') {
          @switch (rec.method) {
            @case ('KNOWLEDGE_TEST') {
              <wa-knowledge-test
                [record]="rec"
                [draft]="draft()"
                (changed)="saveDraft(rec.id, $event)"
                (submitted)="submit($event)"
              />
            }
            @case ('TECHNICAL_CHALLENGE') {
              <wa-technical-challenge
                [record]="rec"
                [draft]="draft()"
                (changed)="saveDraft(rec.id, $event)"
                (submitted)="submit($event)"
              />
            }
            @case ('CASE_ANALYSIS') {
              <wa-case-analysis
                [record]="rec"
                [draft]="draft()"
                (changed)="saveDraft(rec.id, $event)"
                (submitted)="submit($event)"
              />
            }
            @case ('PROFESSIONAL_DOSSIER') {
              <wa-professional-dossier
                [record]="rec"
                [draft]="draft()"
                (changed)="saveDraft(rec.id, $event)"
                (submitted)="submit($event)"
              />
            }
            @case ('DEFENSE_INTERVIEW') {
              <wa-defense-interview
                [record]="rec"
                [draft]="draft()"
                (changed)="saveDraft(rec.id, $event)"
                (submitted)="submit($event)"
              />
            }
          }
        } @else {
          <section class="eval-panel">
            <h2>Évaluation en cours de traitement</h2>
            <p class="eval-panel__sub">
              Statut : {{ statusLabels[rec.status] }}. Rechargez la page dans un instant.
            </p>
          </section>
        }
      } @else {
        <section class="eval-panel">
          <h2>Choisissez votre méthode d’évaluation</h2>
          <p class="eval-panel__sub">
            Cinq instruments réellement différents. Le choix vous appartient : il engage le type
            de preuve que vous produisez. Chaque épreuve est contextualisée à partir du parcours
            réellement suivi, avec son propre document, sa passation et sa correction.
          </p>
          <div class="methods">
            @for (method of methods; track method) {
              <button
                type="button"
                class="method"
                [class.method--on]="selected() === method"
                [style.--eval-accent]="accentFor(method).accent"
                [style.--eval-accent-soft]="accentFor(method).soft"
                (click)="selected.set(method)"
              >
                <span class="method__icon material-symbols-outlined">{{ info[method].icon }}</span>
                <strong>{{ labels[method] }}</strong>
                <p>{{ info[method].instrument }}</p>
                <div class="method__meta">
                  <span>{{ info[method].duration }}</span>
                </div>
                <div class="method__meta">
                  <span>Preuve : {{ info[method].proof }}</span>
                </div>
              </button>
            }
          </div>

          <div class="eval-actions" style="margin-top: 16px">
            <button
              class="eval-btn eval-btn--primary"
              type="button"
              [disabled]="!selected()"
              (click)="open()"
            >
              <span class="material-symbols-outlined">auto_awesome</span>
              Générer l’évaluation
            </button>
            @if (feedback()) {
              <span class="wa-small wa-muted">{{ feedback() }}</span>
            }
          </div>
        </section>
      }
    </div>
  `,
  styleUrl: './evaluation.scss',
  styles: [
    `
      .simple {
        margin: 0;
        padding-left: 18px;
        font-size: 12.5px;
        line-height: 1.7;
      }
      .cert {
        display: flex;
        align-items: center;
        gap: 14px;
        border-left: 4px solid var(--wa-success);
      }
      .cert__icon {
        font-size: 38px;
        color: var(--wa-success);
      }
      .cert div {
        flex: 1;
      }
      .failed {
        border-left: 4px solid var(--wa-danger);
      }
      @media (max-width: 820px) {
        .wa-grid--2 {
          grid-template-columns: 1fr !important;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EvaluationWorkspace {
  private readonly data = inject(DataService);

  readonly requestId = input.required<string>();

  readonly request = computed(() => this.data.requestById(this.requestId()));
  readonly program = computed(() => this.data.programFor(this.requestId()));
  /**
   * Mode reprise : l'employé a échoué, il relit son parcours et revient
   * générer une nouvelle épreuve. Le sélecteur des cinq méthodes
   * réapparaît, sans effacer l'historique des tentatives.
   */
  readonly retryMode = signal(false);
  readonly record = computed(() =>
    this.retryMode() ? undefined : this.data.evaluationFor(this.requestId()),
  );
  readonly report = computed(() => {
    const record = this.record();
    return record ? this.data.reportFor(record.id) : undefined;
  });
  /**
   * Brouillon de réponses de l'épreuve en cours.
   *
   * Les réponses saisies sont conservées au fil de la navigation : quitter
   * l'épreuve puis y revenir ne doit pas effacer le travail.
   */
  readonly draft = computed(() => {
    const record = this.record();
    return record ? this.data.evaluationDraft(record.id) : EMPTY_ANSWERS;
  });
  readonly certificate = computed(() => this.data.certificateFor(this.requestId()));
  readonly guard = computed(() => this.data.evaluationService.canEvaluate(this.requestId()));
  readonly attempts = computed(() => this.data.evaluationAttempts(this.requestId()));

  readonly methods = EVALUATION_METHODS;
  readonly labels = EVALUATION_METHOD_LABELS;
  readonly statusLabels = EVALUATION_STATUS_LABELS;
  readonly info = EVALUATION_METHOD_INFO;
  readonly FORMAT_LABELS = FORMAT_LABELS;

  readonly selected = signal<EvaluationMethod | null>(null);
  readonly feedback = signal('');

  readonly accent = computed(() => this.accentFor(this.record()?.method ?? this.selected() ?? 'KNOWLEDGE_TEST'));

  accentFor(method: EvaluationMethod): { accent: string; soft: string; head: string } {
    return ACCENTS[method];
  }

  docTitle(record: { method: EvaluationMethod; document: { title: string } }): string {
    void record.method;
    return record.document.title;
  }

  docInstructions(record: { document: { instructions: string[] } }): string[] {
    return record.document.instructions;
  }

  percentOf(earned: number, max: number): number {
    return max === 0 ? 0 : Math.round((earned / max) * 100);
  }

  open(): void {
    const method = this.selected();
    if (!method) {
      return;
    }
    const result = this.data.openEvaluation(this.requestId(), method);
    this.feedback.set(result.message);
    if (result.ok) {
      // Nouvelle épreuve générée : on quitte le mode reprise.
      this.retryMode.set(false);
    }
  }

  /**
   * Reprise après un échec : l'employé revient de relire son parcours et
   * choisit une nouvelle méthode d'évaluation. L'épreuve est régénérée
   * à partir du curriculum réellement suivi.
   */
  retry(): void {
    this.retryMode.set(true);
    this.selected.set(null);
    this.feedback.set(
      'Choisissez une nouvelle méthode : l’épreuve est régénérée à partir de votre parcours.',
    );
  }

  start(): void {
    this.data.startEvaluation(this.requestId());
  }

  submit(answers: EvaluationAnswers): void {
    const report: EvaluationReport | undefined = this.data.submitEvaluation(this.requestId(), answers);
    if (!report) {
      return;
    }
    const record = this.data.evaluationFor(this.requestId());
    if (record) {
      this.data.finalizeEvaluation(record.id);
    }
  }

  /** Conserve le brouillon de réponses pendant la passation. */
  saveDraft(evaluationId: string, answers: EvaluationAnswers): void {
    this.data.saveEvaluationDraft(evaluationId, answers);
  }
}
