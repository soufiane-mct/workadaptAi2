import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  COLLECTION_SOURCE_LABELS,
  FORMAT_LABELS,
  GAP_LIFECYCLE_LABELS,
  SKILL_SOURCE_LABELS,
  TrainingFormat,
} from '../../core/models';
import { DataService } from '../../core/data/data.service';

@Component({
  selector: 'wa-gap-detail',
  imports: [RouterLink],
  styleUrl: '../pages.scss',
  template: `
    @if (gap(); as g) {
      <div class="page">
        <header class="page-head">
          <div>
            <a class="wa-small" routerLink="/app/ecarts" style="color: var(--wa-primary-deep); font-weight: 600">
              ← Mes écarts
            </a>
            <h1 style="margin-top: 6px">{{ g.skillLabel }}</h1>
            <p>{{ g.inference }}</p>
          </div>
          <div class="page-head__actions">
            @if (g.requestId) {
              <a class="btn" [routerLink]="['/app/formations', g.requestId]">
                <span class="material-symbols-outlined">school</span>
                Ouvrir le parcours
              </a>
            }
            @if (canGenerate()) {
              <button class="btn btn--primary" type="button" (click)="generate(selectedFormat())">
                <span class="material-symbols-outlined">auto_awesome</span>
                Générer {{ formatLabels[selectedFormat()] }}
              </button>
            }
          </div>
        </header>

        <div class="stat-grid">
          <div class="stat">
            <span>Niveau estimé</span>
            <strong>{{ g.currentLevel }}<small>/100</small></strong>
            <small>{{ sourceLabel(g.sources[0]) }}</small>
          </div>
          <div class="stat">
            <span>Niveau attendu</span>
            <strong>{{ g.targetLevel }}<small>/100</small></strong>
            <small>Référentiel du poste</small>
          </div>
          <div class="stat">
            <span>Écart</span>
            <strong>{{ g.gap }}<small> pts</small></strong>
            <small>{{ priorityLabel(g.priority) }}</small>
          </div>
          <div class="stat">
            <span>Statut</span>
            <strong style="font-size: 15px">{{ lifecycle[g.status] }}</strong>
            <small>Détecté le {{ day(g.detectedAt) }}</small>
          </div>
        </div>

        <div class="split">
          <div style="display: flex; flex-direction: column; gap: 18px">
            <section class="panel">
              <h2>Faits observés</h2>
              <p class="panel__sub">
                Chaque fait est horodaté et sourcé. Aucune conclusion n’est présentée comme un
                fait : l’inférence est séparée ci-dessous.
              </p>
              <div class="list">
                @for (fact of g.observedFacts; track fact.id) {
                  <div class="row" style="align-items: flex-start">
                    <span class="icon-round material-symbols-outlined">{{ fact.observed ? 'visibility' : 'edit_note' }}</span>
                    <div class="row__main">
                      <strong>{{ fact.statement }}</strong>
                      <p>{{ when(fact.at) }} · {{ sourceLabel(fact.source) }} · confiance {{ Math.round(fact.confidence * 100) }} %</p>
                    </div>
                    <span class="wa-chip" [class]="fact.observed ? 'wa-chip wa-chip--success' : 'wa-chip wa-chip--neutral'">
                      {{ fact.observed ? 'Observé' : 'Déclaré' }}
                    </span>
                  </div>
                }
                @if (g.observedFacts.length === 0) {
                  <p class="empty">Aucun fait disponible.</p>
                }
              </div>

              <h3 class="sub">Inférence de l’IA</h3>
              <p class="note note--info">{{ g.inference }}</p>
            </section>

            <section class="panel">
              <h2>Historique de la compétence</h2>
              <p class="panel__sub">Chaque évolution indique sa cause et sa preuve.</p>
              @if (history().length === 0) {
                <p class="empty">Aucune évolution enregistrée pour l’instant.</p>
              }
              <div class="list">
                @for (entry of history(); track entry.id) {
                  <div class="row">
                    <div class="row__main">
                      <strong>{{ entry.previousLevel }} → {{ entry.newLevel }}/100</strong>
                      <p>{{ causeLabel(entry.cause) }} · confiance {{ Math.round(entry.confidence * 100) }} %</p>
                    </div>
                    <div class="row__meta">
                      <small>{{ when(entry.at) }}</small>
                    </div>
                  </div>
                }
              </div>
            </section>

            <section class="panel">
              <h2>Événements de collecte liés</h2>
              @if (events().length === 0) {
                <p class="empty">Aucun événement lié à cette compétence.</p>
              }
              <div class="list">
                @for (event of events(); track event.id) {
                  <div class="row" style="align-items: flex-start">
                    <div class="row__main">
                      <strong>{{ event.label }}</strong>
                      <p>{{ event.detail }}</p>
                      <small class="wa-small wa-muted">{{ when(event.at) }} · {{ sourceLabel(event.source) }} · {{ event.proof }}</small>
                    </div>
                  </div>
                }
              </div>
            </section>
          </div>

          <div style="display: flex; flex-direction: column; gap: 18px">
            <section class="panel">
              <h2>Formats recommandés</h2>
              <p class="panel__sub">
                Le format dominant est choisi par l’IA selon la nature de l’écart. Vous pouvez
                choisir un autre format avant la génération.
              </p>
              <div class="list">
                @for (format of g.recommendedFormats; track format) {
                  <button
                    type="button"
                    class="format-option"
                    [class.format-option--on]="selectedFormat() === format"
                    (click)="selectedFormat.set(format)"
                  >
                    <span class="material-symbols-outlined">{{ iconFor(format) }}</span>
                    <span>
                      <strong>{{ formatLabels[format] }}</strong>
                      <small>{{ rationale(format) }}</small>
                    </span>
                  </button>
                }
              </div>
              @if (!canGenerate()) {
                <p class="note" style="margin-top: 10px">
                  Ce parcours ne peut pas être régénéré dans son état actuel
                  ({{ lifecycle[g.status] }}).
                </p>
              }
            </section>

            <section class="panel">
              <h2>Résolution de l’écart</h2>
              <div class="kv-grid">
                <div class="kv">
                  <span>Statut</span>
                  <strong>{{ lifecycle[g.status] }}</strong>
                </div>
                <div class="kv">
                  <span>Parcours lié</span>
                  <strong>{{ g.requestId ? 'Oui' : 'Aucun' }}</strong>
                </div>
                <div class="kv">
                  <span>Résolu le</span>
                  <strong>{{ g.resolvedAt ? day(g.resolvedAt) : '—' }}</strong>
                </div>
              </div>
              <p class="panel__sub" style="margin-top: 12px">
                Un écart n’est résolu que lorsque le niveau attendu est atteint et prouvé par
                une évaluation réussie. La fin de formation ne suffit jamais.
              </p>
            </section>

            <section class="panel">
              <h2>Règle de la boucle</h2>
              <p class="panel__sub" style="margin-bottom: 0">
                Formation terminée → la preuve de fin est réinjectée dans la collecte → écart
                partiellement résolu → évaluation → le résultat est réinjecté → écart résolu ou
                remédiation créée.
              </p>
            </section>
          </div>
        </div>
      </div>
    } @else {
      <p class="empty">Écart introuvable. <a routerLink="/app/ecarts">Retour à la liste</a></p>
    }
  `,
  styles: [
    `
      .format-option {
        display: flex;
        gap: 10px;
        align-items: flex-start;
        text-align: left;
        padding: 10px 12px;
        border-radius: 11px;
        border: 1px solid var(--wa-border);
        background: #fff;
        cursor: pointer;
      }
      .format-option--on {
        border-color: var(--wa-primary);
        background: var(--wa-primary-soft);
      }
      .format-option .material-symbols-outlined {
        color: var(--wa-primary);
      }
      .format-option strong {
        display: block;
        font-size: 12.5px;
      }
      .format-option small {
        font-size: 10.5px;
        line-height: 1.45;
        color: var(--wa-ink-soft);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GapDetailPage {
  private readonly data = inject(DataService);
  private readonly router = inject(Router);

  readonly gapId = input.required<string>();

  readonly gap = computed(() => this.data.gapById(this.gapId()));
  readonly lifecycle = GAP_LIFECYCLE_LABELS;
  readonly formatLabels = FORMAT_LABELS;
  readonly Math = Math;

  readonly selectedFormat = signal<TrainingFormat>('PRACTICAL');

  readonly history = computed(() => {
    const gap = this.gap();
    return gap ? this.data.historyFor(gap.skillCode) : [];
  });

  readonly events = computed(() => {
    const gap = this.gap();
    return gap ? this.data.eventsForSkill(gap.skillCode) : [];
  });

  constructor() {
    // Aligne le format sélectionné sur la première recommandation réelle.
    queueMicrotask(() => {
      const gap = this.gap();
      if (gap && gap.recommendedFormats.length > 0) {
        this.selectedFormat.set(gap.recommendedFormats[0]);
      }
    });
  }

  canGenerate(): boolean {
    const gap = this.gap();
    return !!gap && !['EN_ATTENTE', 'EN_FORMATION', 'RESOLU'].includes(gap.status);
  }

  generate(format: TrainingFormat): void {
    const gap = this.gap();
    if (!gap) {
      return;
    }
    const request = this.data.generateTrainingForGap(gap.id, format);
    if (request) {
      void this.router.navigate(['/app/formations', request.id]);
    }
  }

  sourceLabel(source: string): string {
    return (
      COLLECTION_SOURCE_LABELS[source as keyof typeof COLLECTION_SOURCE_LABELS] ??
      SKILL_SOURCE_LABELS[source as keyof typeof SKILL_SOURCE_LABELS] ??
      source
    );
  }

  causeLabel(cause: string): string {
    switch (cause) {
      case 'FORMATION':
        return 'Fin de formation';
      case 'EVALUATION':
        return 'Résultat d’évaluation';
      case 'ACTIVITE_OBSERVEE':
        return 'Activité observée';
      default:
        return 'Veille technologique';
    }
  }

  priorityLabel(priority: string): string {
    return priority === 'HIGH' ? 'Priorité haute' : priority === 'MEDIUM' ? 'Priorité moyenne' : 'Priorité basse';
  }

  iconFor(format: TrainingFormat): string {
    const icons: Record<TrainingFormat, string> = {
      MULTIMEDIA: 'play_circle',
      INTERACTIVE: 'style',
      PRACTICAL: 'terminal',
      PROJECT: 'account_tree',
      SIMULATION: 'siren',
      AI_TUTORED: 'psychology',
      COLLABORATIVE: 'groups',
    };
    return icons[format];
  }

  rationale(format: TrainingFormat): string {
    const text: Record<TrainingFormat, string> = {
      MULTIMEDIA: 'Acquérir les repères par une série documentaire structurée.',
      INTERACTIVE: 'Consolider par répétition espacée et rappel actif.',
      PRACTICAL: 'Pratiquer en environnement isolé, preuve vérifiable à chaque atelier.',
      PROJECT: 'Produire un livrable réel par jalons évalués.',
      SIMULATION: 'Décider sous contrainte dans un incident simulé.',
      AI_TUTORED: 'Construire le raisonnement par dialogue socratique.',
      COLLABORATIVE: 'Apprendre dans un sprint d’équipe avec revue par les pairs.',
    };
    return text[format];
  }

  when(value: string): string {
    return new Date(value).toLocaleString('fr-FR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  day(value: string): string {
    return new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  }
}
