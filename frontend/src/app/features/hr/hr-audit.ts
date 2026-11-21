import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { AuditEntry } from '../../core/models';
import { DataService } from '../../core/data/data.service';

type AuditFilter = 'ALL' | 'DECISION' | 'FORMATION' | 'EVALUATION' | 'COLLECTE' | 'SYSTEME';

@Component({
  selector: 'wa-hr-audit-page',
  styleUrl: '../pages.scss',
  template: `
    <div class="page">
      <header class="page-head">
        <div>
          <h1>Journal d’audit</h1>
          <p>
            Toute décision, tout accès et toute correction sont horodatés avec leur auteur. Le
            journal est append-only : une entrée ne peut être ni modifiée ni supprimée, y compris
            par un administrateur. Il ne contient aucun détail de réponse d’évaluation.
          </p>
        </div>
        <div class="page-head__actions">
          <button class="btn" type="button" (click)="exportAudit()">
            <span class="material-symbols-outlined">download</span>
            Exporter (simulé)
          </button>
          <span class="wa-chip wa-chip--neutral">Conservation 12 mois</span>
        </div>
      </header>

      @if (message()) {
        <p class="note note--ok">{{ message() }}</p>
      }

      <div class="stat-grid">
        <div class="stat">
          <span>Entrées</span>
          <strong>{{ entries().length }}</strong>
          <small>Journal complet</small>
        </div>
        <div class="stat">
          <span>Décisions humaines</span>
          <strong>{{ decisionCount() }}</strong>
          <small>Validation, rejet, modification</small>
        </div>
        <div class="stat">
          <span>Actions d’agents</span>
          <strong>{{ agentCount() }}</strong>
          <small>Traçables individuellement</small>
        </div>
        <div class="stat">
          <span>Acteurs distincts</span>
          <strong>{{ actors().length }}</strong>
          <small>Humains et agents</small>
        </div>
      </div>

      <section class="panel">
        <div class="toolbar" style="margin-bottom: 12px">
          <div class="filters">
            @for (filter of filters; track filter.value) {
              <button
                type="button"
                class="filter"
                [class.filter--on]="active() === filter.value"
                (click)="active.set(filter.value)"
              >
                {{ filter.label }}
              </button>
            }
          </div>
          <div class="toolbar__spacer"></div>
          <input
            class="wa-input search"
            type="search"
            placeholder="Rechercher un acteur, une cible, un détail…"
            [value]="query()"
            (input)="query.set($any($event.target).value)"
          />
        </div>

        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Horodatage</th>
                <th>Acteur</th>
                <th>Action</th>
                <th>Cible</th>
                <th>Détail</th>
                <th>Origine</th>
              </tr>
            </thead>
            <tbody>
              @for (entry of filtered(); track entry.id) {
                <tr>
                  <td class="wa-small mono">{{ when(entry.at) }}</td>
                  <td>
                    <strong class="actor">{{ entry.actor }}</strong>
                    <div class="wa-small wa-muted">{{ actorKind(entry) }}</div>
                  </td>
                  <td>
                    <span class="wa-chip" [class]="actionClass(entry)">{{ entry.action }}</span>
                  </td>
                  <td class="wa-small">{{ targetLabel(entry.target) }}</td>
                  <td class="wa-small detail">{{ entry.detail }}</td>
                  <td class="wa-small mono">{{ entry.ip }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        @if (filtered().length === 0) {
          <p class="empty">Aucune entrée ne correspond à ce filtre.</p>
        }
      </section>

      <div class="split">
        <section class="panel">
          <h2>Acteurs du journal</h2>
          <p class="panel__sub">
            Un acteur humain et un agent ne sont pas équivalents : leurs actions sont distinguées.
          </p>
          <div class="actors">
            @for (actor of actorSummary(); track actor.name) {
              <div class="actor-row">
                <span class="actor-row__icon material-symbols-outlined">{{ actor.agent ? 'smart_toy' : 'person' }}</span>
                <div class="actor-row__main">
                  <strong>{{ actor.name }}</strong>
                  <small>{{ actor.agent ? 'Agent IA' : 'Humain' }} · {{ actor.count }} action(s)</small>
                </div>
                <div class="actor-row__bar">
                  <span [style.width.%]="actor.share"></span>
                </div>
              </div>
            }
          </div>
        </section>

        <div style="display: flex; flex-direction: column; gap: 18px">
          <section class="panel">
            <h2>Garanties</h2>
            <ul class="rules">
              <li>Écriture seule : aucune entrée n’est modifiable ni supprimable.</li>
              <li>Chaque décision porte son auteur, sa date et son adresse d’origine.</li>
              <li>Les refus d’accès et les contestations sont conservés.</li>
              <li>Le journal est réservé aux administrateurs, pas aux ressources humaines ni aux superviseurs.</li>
              <li>Aucune réponse détaillée d’évaluation n’y figure.</li>
            </ul>
          </section>

          <section class="panel">
            <h2>Que faire en cas d’anomalie ?</h2>
            <p class="panel__sub" style="margin-bottom: 10px">
              Une décision contestée n’est pas effacée : une nouvelle entrée documente la
              contestation et sa résolution.
            </p>
            <ol class="rules">
              <li>Identifier l’entrée concernée par sa date et sa cible.</li>
              <li>Vérifier l’acteur et l’origine de l’action.</li>
              <li>Conserver la contestation dans le journal.</li>
              <li>Faire trancher par le rôle compétent, jamais par l’administrateur seul.</li>
            </ol>
          </section>

          <section class="panel">
            <h2>Export simulé</h2>
            <p class="panel__sub" style="margin-bottom: 0">
              L’export du journal est simulé dans cette démonstration. Il produirait un CSV
              horodaté, sans contenu d’évaluation, avec le périmètre demandé.
            </p>
          </section>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .search {
        max-width: 290px;
      }
      .mono {
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-size: 10px;
      }
      .actor {
        font-size: 11.5px;
      }
      .detail {
        max-width: 280px;
        line-height: 1.45;
      }
      .actors {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .actor-row {
        display: flex;
        gap: 9px;
        align-items: center;
        padding: 8px 10px;
        border-radius: 10px;
        background: var(--wa-surface-2);
      }
      .actor-row__icon {
        width: 28px;
        height: 28px;
        flex: none;
        border-radius: 8px;
        background: #fff;
        color: var(--wa-primary-deep);
        display: grid;
        place-items: center;
        font-size: 16px;
      }
      .actor-row__main {
        flex: none;
        width: 170px;
      }
      .actor-row__main strong {
        display: block;
        font-size: 11.5px;
      }
      .actor-row__main small {
        font-size: 9.5px;
        color: var(--wa-ink-faint);
      }
      .actor-row__bar {
        flex: 1;
        height: 7px;
        border-radius: 999px;
        background: var(--wa-surface-3);
        overflow: hidden;
      }
      .actor-row__bar span {
        display: block;
        height: 100%;
        background: var(--wa-primary);
      }
      .rules {
        margin: 0;
        padding-left: 18px;
        font-size: 12px;
        line-height: 1.7;
        color: var(--wa-ink-soft);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HrAuditPage {
  private readonly data = inject(DataService);

  readonly entries = this.data.auditEntries;

  readonly filters: { value: AuditFilter; label: string }[] = [
    { value: 'ALL', label: 'Tout' },
    { value: 'DECISION', label: 'Décisions' },
    { value: 'FORMATION', label: 'Formation' },
    { value: 'EVALUATION', label: 'Évaluation' },
    { value: 'COLLECTE', label: 'Collecte' },
    { value: 'SYSTEME', label: 'Système' },
  ];

  readonly active = signal<AuditFilter>('ALL');
  readonly query = signal('');
  readonly message = signal('');

  readonly filtered = computed(() => {
    const query = this.query().trim().toLowerCase();
    return this.entries().filter((entry) => {
      const inFilter = this.matchesFilter(entry);
      const inQuery =
        query.length === 0 ||
        `${entry.actor} ${entry.action} ${entry.target} ${entry.detail}`
          .toLowerCase()
          .includes(query);
      return inFilter && inQuery;
    });
  });

  readonly actors = computed(() => [...new Set(this.entries().map((entry) => entry.actor))]);
  readonly decisionCount = computed(
    () => this.entries().filter((entry) => this.isDecision(entry)).length,
  );
  readonly agentCount = computed(
    () => this.entries().filter((entry) => this.isAgent(entry.actor)).length,
  );

  readonly actorSummary = computed(() => {
    const total = Math.max(1, this.entries().length);
    return this.actors().map((name) => {
      const count = this.entries().filter((entry) => entry.actor === name).length;
      return {
        name,
        agent: this.isAgent(name),
        count,
        share: Math.round((count / total) * 100),
      };
    });
  });

  exportAudit(): void {
    this.message.set(
      `Export simulé du journal : ${this.filtered().length} entrée(s), filtre « ${
        this.filters.find((filter) => filter.value === this.active())?.label
      } ». Aucun fichier réel n’est produit ; un service serveur générera le CSV horodaté.`,
    );
  }

  actorKind(entry: AuditEntry): string {
    return this.isAgent(entry.actor) ? 'Agent IA' : 'Humain';
  }

  /** Présente la cible sans exposer d'identifiant technique brut. */
  targetLabel(target: string): string {
    if (!target) {
      return 'Ressource interne';
    }
    if (target.startsWith('gap-')) {
      return 'Écart de compétences';
    }
    if (target.startsWith('treq-') || target.startsWith('req-')) {
      return 'Demande de formation';
    }
    if (target.startsWith('eval-')) {
      return 'Évaluation';
    }
    if (target.startsWith('cert-')) {
      return 'Certificat interne';
    }
    if (target.startsWith('usr-')) {
      return 'Compte utilisateur';
    }
    if (target.startsWith('emp-')) {
      return 'Espace collaborateur';
    }
    if (target.startsWith('wf-')) {
      return 'Flux de travail';
    }
    if (target.startsWith('evt-')) {
      return 'Événement de collecte';
    }
    if (target.startsWith('aud-')) {
      return 'Entrée d’audit';
    }
    if (target.startsWith('rpt-')) {
      return 'Rapport agrégé';
    }
    return target;
  }

  actionClass(entry: AuditEntry): string {
    if (this.isDecision(entry)) {
      return 'wa-chip wa-chip--warning';
    }
    if (entry.action.toLowerCase().includes('rejet') || entry.action.toLowerCase().includes('échec')) {
      return 'wa-chip wa-chip--danger';
    }
    if (this.isAgent(entry.actor)) {
      return 'wa-chip wa-chip--info';
    }
    return 'wa-chip wa-chip--neutral';
  }

  when(value: string): string {
    return new Date(value).toLocaleString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private matchesFilter(entry: AuditEntry): boolean {
    const filter = this.active();
    if (filter === 'ALL') {
      return true;
    }
    if (filter === 'DECISION') {
      return this.isDecision(entry);
    }
    if (filter === 'COLLECTE') {
      return (
        entry.action.toLowerCase().includes('collecte') ||
        entry.target.toLowerCase().includes('collecte')
      );
    }
    if (filter === 'EVALUATION') {
      return (
        entry.action.toLowerCase().includes('évaluation') ||
        entry.action.toLowerCase().includes('certificat') ||
        entry.action.toLowerCase().includes('correction')
      );
    }
    if (filter === 'FORMATION') {
      return (
        entry.action.toLowerCase().includes('formation') ||
        entry.action.toLowerCase().includes('parcours') ||
        entry.action.toLowerCase().includes('remédiation')
      );
    }
    return this.isAgent(entry.actor);
  }

  private isDecision(entry: AuditEntry): boolean {
    const action = entry.action.toLowerCase();
    return (
      action.includes('validation') ||
      action.includes('rejet') ||
      action.includes('modification') ||
      action.includes('décision')
    );
  }

  private isAgent(actor: string): boolean {
    return actor.includes('Agent') || actor === 'Orchestrateur';
  }
}
