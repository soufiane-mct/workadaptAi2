import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { COLLECTION_SOURCE_LABELS, CollectionSource } from '../../core/models';
import { DataService } from '../../core/data/data.service';

@Component({
  selector: 'wa-collecte-page',
  styleUrl: '../pages.scss',
  template: `
    <div class="page">
      <header class="page-head">
        <div>
          <h1>Collecte permanente</h1>
          <p>
            La collecte ne s’arrête jamais : après le diagnostic initial, elle continue pendant
            les formations et les évaluations. Chaque événement est horodaté, sourcé et
            vérifiable ; l’IA n’invente aucun fait.
          </p>
        </div>
        <div class="page-head__actions">
          <button class="btn btn--primary" type="button" [disabled]="running()" (click)="run()">
            <span class="material-symbols-outlined">sync</span>
            Lancer une collecte
          </button>
          <button class="btn" type="button" [disabled]="running()" (click)="simulateFailure()">
            <span class="material-symbols-outlined">wifi_off</span>
            Simuler un échec
          </button>
          @if (failed()) {
            <button class="btn" type="button" (click)="retry()">
              <span class="material-symbols-outlined">restart_alt</span>
              Reprendre
            </button>
          }
        </div>
      </header>

      <div class="stat-grid">
        <div class="stat">
          <span>Sources connectées</span>
          <strong>{{ connected() }} / {{ sources().length }}</strong>
          <small>Desktop, applications, veille</small>
        </div>
        <div class="stat">
          <span>Événements (24 h)</span>
          <strong>{{ last24h() }}</strong>
          <small>{{ events().length }} événements conservés</small>
        </div>
        <div class="stat">
          <span>Dernière exécution</span>
          <strong>{{ lastRun()?.status === 'FAILED' ? 'Échec' : 'Réussie' }}</strong>
          <small>{{ when(lastRun()?.startedAt) }}</small>
        </div>
        <div class="stat">
          <span>Écarts en attente</span>
          <strong>{{ queuedGaps().length }}</strong>
          <small>Détectés pendant un cycle actif</small>
        </div>
      </div>

      @if (message()) {
        <p class="note" [class.note--ok]="!failed()" [class.note--danger]="failed()">{{ message() }}</p>
      }

      <div class="split">
        <section class="panel">
          <h2>Fil des événements</h2>
          <p class="panel__sub">
            Les faits observés et les déclarations sont distingués. Une déclaration ne devient
            jamais une preuve sans évaluation.
          </p>
          <div class="timeline">
            @for (event of events(); track event.id) {
              <article class="event">
                <div class="event__dot" [class.event__dot--observed]="event.observed"></div>
                <div class="event__body">
                  <div class="event__head">
                    <strong>{{ event.label }}</strong>
                    <span class="wa-chip wa-chip--neutral">{{ sourceLabel(event.source) }}</span>
                    <span class="event__type">{{ event.observed ? 'Observé' : 'Déclaré' }}</span>
                  </div>
                  <p>{{ event.detail }}</p>
                  <div class="event__foot">
                    <span>{{ when(event.at) }}</span>
                    <span>confiance {{ Math.round(event.confidence * 100) }} %</span>
                    <span class="wa-mono">{{ event.proof }}</span>
                  </div>
                  @if (event.skillCodes.length > 0) {
                    <div class="chips" style="margin-top: 6px">
                      @for (code of event.skillCodes; track code) {
                        <span class="wa-chip wa-chip--info">{{ skillLabel(code) }}</span>
                      }
                    </div>
                  }
                </div>
              </article>
            }
            @if (events().length === 0) {
              <p class="empty">Aucun événement collecté pour l’instant.</p>
            }
          </div>
        </section>

        <div style="display: flex; flex-direction: column; gap: 18px">
          <section class="panel">
            <h2>Sources</h2>
            <p class="panel__sub">Chaque source peut être partielle ou indisponible sans bloquer les autres.</p>
            <div class="list">
              @for (source of sources(); track source.code) {
                <div class="row">
                  <span class="icon-round material-symbols-outlined">{{ iconFor(source.code) }}</span>
                  <div class="row__main">
                    <strong>{{ source.label }}</strong>
                    <p>{{ source.description }}</p>
                    <small class="wa-small wa-muted">Dernière synchro : {{ when(source.lastSync) }} · {{ source.records ?? 0 }} enregistrements</small>
                  </div>
                  <div class="row__meta">
                    <span class="wa-chip" [class]="statusClass(source.status)">{{ statusLabel(source.status) }}</span>
                  </div>
                </div>
              }
            </div>
          </section>

          <section class="panel">
            <h2>Exécutions récentes</h2>
            <p class="panel__sub">Un échec est conservé, jamais masqué.</p>
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Événements</th>
                    <th>Nouveaux écarts</th>
                    <th>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  @for (run of runs(); track run.id) {
                    <tr>
                      <td>{{ run.kind === 'INITIAL' ? 'Initiale' : 'Quotidienne' }}<br /><small class="wa-muted">{{ when(run.startedAt) }}</small></td>
                      <td>{{ run.eventsCount }}</td>
                      <td>{{ run.newGaps }}</td>
                      <td>
                        <span class="wa-chip" [class]="runClass(run.status)">{{ runLabel(run.status) }}</span>
                        @if (run.error) {
                          <div class="wa-small wa-muted" style="margin-top: 4px">{{ run.error }}</div>
                        }
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>

      <section class="panel">
        <h2>Ce que la collecte réinjecte dans la boucle</h2>
        <div class="form-grid form-grid--2">
          <div class="kv">
            <span>Fin de formation</span>
            <strong>Fin de formation réinjectée</strong>
            <p class="wa-small wa-muted" style="margin: 4px 0 0">
              Recalcule le niveau et passe l’écart en « partiellement résolu » : seule
              l’évaluation peut prouver la maîtrise.
            </p>
          </div>
          <div class="kv">
            <span>Résultat d’évaluation</span>
            <strong>Résultat d’évaluation réinjecté</strong>
            <p class="wa-small wa-muted" style="margin: 4px 0 0">
              Fixe le niveau réel, clôt l’écart en cas de réussite, sinon le maintient ouvert et
              déclenche une remédiation.
            </p>
          </div>
        </div>
      </section>
    </div>
  `,
  styles: [
    `
      .timeline {
        display: flex;
        flex-direction: column;
        gap: 0;
      }
      .event {
        display: flex;
        gap: 12px;
        padding: 12px 0;
        border-bottom: 1px dashed var(--wa-border);
      }
      .event:last-child {
        border-bottom: none;
      }
      .event__dot {
        width: 11px;
        height: 11px;
        margin-top: 5px;
        flex: none;
        border-radius: 50%;
        background: #c7d2fe;
        box-shadow: 0 0 0 3px #eef2ff;
      }
      .event__dot--observed {
        background: #0f9d58;
        box-shadow: 0 0 0 3px #e7f7ef;
      }
      .event__body {
        flex: 1;
        min-width: 0;
      }
      .event__head {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }
      .event__head strong {
        font-size: 12.5px;
      }
      .event__type {
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--wa-ink-faint);
        font-weight: 700;
      }
      .event p {
        margin: 3px 0 0;
        font-size: 12px;
        line-height: 1.5;
        color: var(--wa-ink-soft);
      }
      .event__foot {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        margin-top: 5px;
        font-size: 10.5px;
        color: var(--wa-ink-faint);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CollectePage {
  private readonly data = inject(DataService);

  readonly events = this.data.collectionEvents;
  readonly runs = this.data.collectionRuns;
  readonly sources = this.data.dataSources;
  readonly last24h = this.data.collectionService.last24h;
  readonly connected = this.data.collectionService.connectedSources;
  readonly lastRun = this.data.collectionService.lastRun;
  readonly running = this.data.collectionRunning;
  readonly failed = this.data.collectionService.failed;
  readonly queuedGaps = this.data.queuedGaps;
  readonly Math = Math;

  readonly message = signal('');

  run(): void {
    const run = this.data.runDailyCollection();
    this.message.set(
      `Collecte terminée : ${run.eventsCount} événement(s), ${run.newGaps} écart(s) mis à jour.`,
    );
  }

  simulateFailure(): void {
    this.data.runDailyCollection({ simulateFailure: true });
    this.message.set(
      'Échec simulé : le Collecteur local n’a pas répondu. Les autres sources ont été conservées.',
    );
  }

  retry(): void {
    const run = this.data.retryCollection();
    this.message.set(`Reprise effectuée : ${run.eventsCount} événement(s) collecté(s).`);
  }

  skillLabel(code: string): string {
    return this.data.skillByCode(code)?.label ?? code;
  }

  sourceLabel(source: CollectionSource): string {
    return COLLECTION_SOURCE_LABELS[source];
  }

  iconFor(source: CollectionSource): string {
    const icons: Record<CollectionSource, string> = {
      CV: 'description',
      INTERVIEW: 'record_voice_over',
      COLLECTOR: 'computer',
      CONNECTED_APP: 'hub',
      PAST_TRAINING: 'history_edu',
      TRAINING_COMPLETION: 'school',
      TRAINING_STEP: 'fact_check',
      EVALUATION_RESULT: 'grading',
      TECH_WATCH: 'radar',
    };
    return icons[source];
  }

  statusLabel(status: string): string {
    return status === 'CONNECTED' ? 'Connectée' : status === 'PARTIAL' ? 'Partielle' : 'Non connectée';
  }

  statusClass(status: string): string {
    return status === 'CONNECTED'
      ? 'wa-chip wa-chip--success'
      : status === 'PARTIAL'
        ? 'wa-chip wa-chip--warning'
        : 'wa-chip wa-chip--neutral';
  }

  /** Libellé français du statut d'une exécution de collecte. */
  runLabel(status: string): string {
    switch (status) {
      case 'SUCCESS':
        return 'Réussie';
      case 'PARTIAL':
        return 'Partielle';
      case 'FAILED':
        return 'Échec';
      default:
        return 'En cours';
    }
  }

  runClass(status: string): string {
    return status === 'SUCCESS'
      ? 'wa-chip wa-chip--success'
      : status === 'PARTIAL'
        ? 'wa-chip wa-chip--warning'
        : 'wa-chip wa-chip--danger';
  }

  when(value?: string): string {
    if (!value) {
      return 'jamais';
    }
    return new Date(value).toLocaleString('fr-FR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
