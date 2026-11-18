import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  AgentExchange,
  AgentHealth,
  AgentStatus,
  WorkflowRun,
  WorkflowStatus,
} from '../../core/models';
import { DataService } from '../../core/data/data.service';

const HEALTH_LABELS: Record<AgentHealth, string> = {
  RUNNING: 'En exécution',
  IDLE: 'Au repos',
  WAITING_APPROVAL: 'Attente humaine',
  ERROR: 'Erreur',
};

const WORKFLOW_LABELS: Record<WorkflowStatus, string> = {
  RUNNING: 'En cours',
  COMPLETED: 'Terminé',
  WAITING_APPROVAL: 'Attente de validation',
  FAILED: 'Échec',
};

@Component({
  selector: 'wa-agents-page',
  imports: [RouterLink],
  styleUrl: '../pages.scss',
  template: `
    <div class="page">
      <header class="page-head">
        <div>
          <h1>Agents IA et orchestration</h1>
          <p>
            Les agents ne décident pas à la place des humains. Ils collectent, estiment,
            génèrent et corrigent — mais la validation d’un parcours reste une décision humaine
            tracée. Chaque échange inter-agents porte sa source, sa cible et son horodatage.
          </p>
        </div>
        <div class="page-head__actions">
          <span class="wa-chip wa-chip--success">{{ running().length }} en exécution</span>
          <span class="wa-chip wa-chip--warning">{{ waiting().length }} en attente humaine</span>
        </div>
      </header>

      <div class="stat-grid">
        <div class="stat">
          <span>Agents</span>
          <strong>{{ agents().length }}</strong>
          <small>Un agent par responsabilité</small>
        </div>
        <div class="stat">
          <span>Taux de succès moyen</span>
          <strong>{{ successRate() }} %</strong>
          <small>Sur les dernières exécutions</small>
        </div>
        <div class="stat">
          <span>Workflows actifs</span>
          <strong>{{ activeWorkflows() }}</strong>
          <small>Exécutions en cours ou bloquées</small>
        </div>
        <div class="stat">
          <span>Échanges tracés</span>
          <strong>{{ exchanges().length }}</strong>
          <small>Dont {{ pendingExchanges() }} en attente</small>
        </div>
      </div>

      <section class="panel">
        <h2>Agents spécialisés</h2>
        <p class="panel__sub">
          Un agent en erreur n’est jamais masqué : il apparaît en rouge et bloque les étapes
          dépendantes au lieu de produire une donnée douteuse.
        </p>
        <div class="agent-grid">
          @for (agent of agents(); track agent.code) {
            <article class="agent" [attr.data-health]="agent.health">
              <div class="agent__head">
                <span class="agent__icon material-symbols-outlined">{{ iconFor(agent.code) }}</span>
                <div>
                  <strong>{{ agent.name }}</strong>
                  <span class="agent__code wa-mono">{{ agent.code }}</span>
                </div>
                <span class="wa-chip" [class]="healthClass(agent.health)">
                  {{ healthLabels[agent.health] }}
                </span>
              </div>
              <p class="agent__mission">{{ agent.mission }}</p>
              <div class="agent__facts">
                <span>
                  <span class="material-symbols-outlined">schedule</span>
                  {{ agent.durationMs }} ms
                </span>
                <span>
                  <span class="material-symbols-outlined">task_alt</span>
                  {{ agent.successRate }} % de succès
                </span>
                <span>
                  <span class="material-symbols-outlined">history</span>
                  {{ when(agent.lastRun) }}
                </span>
              </div>
              <div class="bar" [class.bar--success]="agent.successRate >= 95" [class.bar--warning]="agent.successRate < 95">
                <span [style.width.%]="agent.successRate"></span>
              </div>
            </article>
          }
        </div>
      </section>

      <section class="panel">
        <h2>Exécutions de workflow</h2>
        <p class="panel__sub">
          Le pipeline complet est visible étape par étape. Une étape en attente de validation
          humaine n’est jamais franchie automatiquement.
        </p>
        <div class="wf-list">
          @for (run of workflows(); track run.id) {
            <article class="wf" [attr.data-status]="run.status">
              <div class="wf__head">
                <div>
                  <strong>{{ run.label }}</strong>
                  <p class="wa-small wa-muted">
                    {{ run.employee }} · démarré {{ when(run.startedAt) }} · étape courante :
                    {{ run.currentStep }}
                  </p>
                </div>
                <span class="wa-chip" [class]="workflowClass(run.status)">
                  {{ workflowLabels[run.status] }}
                </span>
              </div>
              <ol class="steps">
                @for (step of run.steps; track step.name; let i = $index) {
                  <li class="step" [attr.data-state]="step.state">
                    <span class="step__dot">
                      @if (step.state === 'DONE') {
                        <span class="material-symbols-outlined">check</span>
                      } @else if (step.state === 'RUNNING') {
                        <span class="material-symbols-outlined">autorenew</span>
                      } @else if (step.state === 'FAILED') {
                        <span class="material-symbols-outlined">close</span>
                      } @else {
                        {{ i + 1 }}
                      }
                    </span>
                    <div class="step__body">
                      <strong>{{ step.name }}</strong>
                      <small>{{ agentName(step.agent) }} · {{ step.durationMs ?? 0 }} ms</small>
                    </div>
                  </li>
                }
              </ol>
            </article>
          }
        </div>
      </section>

      <div class="split">
        <section class="panel">
          <h2>Échanges inter-agents</h2>
          <p class="panel__sub">
            Chaque message porte un contrat de données. Un échange en échec est conservé pour
            analyse : il n’est pas réécrit.
          </p>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Horodatage</th>
                  <th>De</th>
                  <th>Vers</th>
                  <th>Objet</th>
                  <th>État</th>
                </tr>
              </thead>
              <tbody>
                @for (exchange of exchanges(); track exchange.id) {
                  <tr>
                    <td class="wa-small">{{ when(exchange.at) }}</td>
                    <td>{{ agentName(exchange.from) }}</td>
                    <td>{{ agentName(exchange.to) }}</td>
                    <td>{{ exchange.topic }}</td>
                    <td>
                      <span class="wa-chip" [class]="exchangeClass(exchange)">
                        {{ exchangeLabel(exchange) }}
                      </span>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </section>

        <div style="display: flex; flex-direction: column; gap: 18px">
          <section class="panel">
            <h2>Garde-fous</h2>
            <ul class="rules">
              <li>Aucun agent ne valide un parcours à la place du superviseur.</li>
              <li>Aucun agent ne certifie sans évaluation réellement passée.</li>
              <li>Aucun agent ne modifie un niveau de compétence sans preuve associée.</li>
              <li>Aucun agent ne crée de formation pendant qu’une évaluation est en cours.</li>
              <li>La collecte continue même lorsque le pipeline attend une décision.</li>
            </ul>
          </section>

          <section class="panel">
            <h2>Dernières traces</h2>
            <div class="traces">
              @for (entry of audit(); track entry.id) {
                <div class="trace">
                  <strong>{{ entry.action }}</strong>
                  <p>{{ entry.detail }}</p>
                  <small>{{ entry.actor }} · {{ when(entry.at) }}</small>
                </div>
              }
              @if (audit().length === 0) {
                <p class="empty">Aucune trace d’exécution pour l’instant.</p>
              }
            </div>
            <a class="btn btn--small" routerLink="/app/rh/audit" style="margin-top: 10px">
              <span class="material-symbols-outlined">history</span>
              Journal d’audit complet
            </a>
          </section>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .agent-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
        gap: 10px;
      }
      .agent {
        padding: 10px 12px;
        border-radius: 12px;
        border: 1px solid var(--wa-border);
        background: #fff;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .agent[data-health='RUNNING'] {
        border-left: 3px solid var(--wa-success);
      }
      .agent[data-health='WAITING_APPROVAL'] {
        border-left: 3px solid var(--wa-warning);
      }
      .agent[data-health='ERROR'] {
        border-left: 3px solid var(--wa-danger);
      }
      .agent[data-health='IDLE'] {
        border-left: 3px solid var(--wa-ink-faint);
      }
      .agent__head {
        display: flex;
        align-items: flex-start;
        gap: 8px;
      }
      .agent__icon {
        width: 30px;
        height: 30px;
        flex: none;
        border-radius: 9px;
        background: var(--wa-surface-2);
        color: var(--wa-primary-deep);
        display: grid;
        place-items: center;
        font-size: 17px;
      }
      .agent__head > div {
        flex: 1;
        min-width: 0;
      }
      .agent__head strong {
        display: block;
        font-size: 12px;
      }
      .agent__code {
        font-size: 9.5px;
        color: var(--wa-ink-faint);
      }
      .agent__mission {
        margin: 0;
        font-size: 11.5px;
        line-height: 1.5;
        color: var(--wa-ink-soft);
      }
      .agent__facts {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        font-size: 10px;
        color: var(--wa-ink-faint);
      }
      .agent__facts span {
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }
      .agent__facts .material-symbols-outlined {
        font-size: 13px;
      }
      .wf-list {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .wf {
        padding: 12px 14px;
        border-radius: 12px;
        border: 1px solid var(--wa-border);
        background: #fff;
      }
      .wf[data-status='WAITING_APPROVAL'] {
        border-left: 3px solid var(--wa-warning);
      }
      .wf[data-status='RUNNING'] {
        border-left: 3px solid var(--wa-primary);
      }
      .wf[data-status='FAILED'] {
        border-left: 3px solid var(--wa-danger);
      }
      .wf__head {
        display: flex;
        justify-content: space-between;
        gap: 10px;
        align-items: flex-start;
        flex-wrap: wrap;
      }
      .wf__head strong {
        font-size: 13px;
      }
      .wf__head p {
        margin: 3px 0 0;
      }
      .steps {
        list-style: none;
        margin: 10px 0 0;
        padding: 0;
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }
      .step {
        display: flex;
        gap: 6px;
        align-items: flex-start;
        padding: 6px 9px;
        border-radius: 9px;
        background: var(--wa-surface-2);
        min-width: 170px;
        flex: 1;
      }
      .step__dot {
        width: 18px;
        height: 18px;
        flex: none;
        border-radius: 50%;
        display: grid;
        place-items: center;
        background: #e2e8f0;
        font-size: 9px;
        font-weight: 700;
        color: var(--wa-ink-soft);
      }
      .step__dot .material-symbols-outlined {
        font-size: 12px;
      }
      .step[data-state='DONE'] .step__dot {
        background: var(--wa-success);
        color: #fff;
      }
      .step[data-state='RUNNING'] .step__dot {
        background: var(--wa-primary);
        color: #fff;
        animation: spin 1.6s linear infinite;
      }
      .step[data-state='FAILED'] .step__dot {
        background: var(--wa-danger);
        color: #fff;
      }
      .step__body strong {
        display: block;
        font-size: 11px;
      }
      .step__body small {
        font-size: 9.5px;
        color: var(--wa-ink-faint);
      }
      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }
      .rules {
        margin: 0;
        padding-left: 18px;
        font-size: 12px;
        line-height: 1.7;
        color: var(--wa-ink-soft);
      }
      .traces {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .trace strong {
        font-size: 12px;
      }
      .trace p {
        margin: 2px 0;
        font-size: 11.5px;
        line-height: 1.45;
        color: var(--wa-ink-soft);
      }
      .trace small {
        font-size: 10px;
        color: var(--wa-ink-faint);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AgentsPage {
  private readonly data = inject(DataService);

  readonly agents = computed(() => this.data.agents);
  readonly workflows = computed(() => this.data.workflows);
  readonly exchanges = computed(() => this.data.exchanges);

  readonly healthLabels = HEALTH_LABELS;
  readonly workflowLabels = WORKFLOW_LABELS;

  readonly running = computed(() =>
    this.agents().filter((agent) => agent.health === 'RUNNING'),
  );
  readonly waiting = computed(() =>
    this.agents().filter((agent) => agent.health === 'WAITING_APPROVAL'),
  );
  readonly activeWorkflows = computed(
    () =>
      this.workflows().filter((run) => run.status === 'RUNNING' || run.status === 'WAITING_APPROVAL')
        .length,
  );
  readonly pendingExchanges = computed(
    () => this.exchanges().filter((exchange) => exchange.status !== 'DELIVERED').length,
  );
  readonly successRate = computed(() => {
    const agents = this.agents();
    return agents.length === 0
      ? 0
      : Math.round(agents.reduce((sum, agent) => sum + agent.successRate, 0) / agents.length);
  });

  readonly audit = computed(() => this.data.auditEntries().slice(0, 5));

  iconFor(code: string): string {
    const icons: Record<string, string> = {
      ORCH: 'hub',
      DATA_COLLECTION: 'sensors',
      SKILL_INTELLIGENCE: 'psychology',
      TECHNOLOGY_WATCH: 'radar',
      LEARNING_PLANNER: 'route',
      SUPERVISOR_WORKFLOW: 'fact_check',
      TRAINING: 'school',
      ASSESSMENT_CERTIFICATION: 'workspace_premium',
    };
    return icons[code] ?? 'smart_toy';
  }

  agentName(code: string): string {
    return this.agents().find((agent) => agent.code === code)?.name ?? code;
  }

  healthClass(health: AgentHealth): string {
    switch (health) {
      case 'RUNNING':
        return 'wa-chip wa-chip--success';
      case 'WAITING_APPROVAL':
        return 'wa-chip wa-chip--warning';
      case 'ERROR':
        return 'wa-chip wa-chip--danger';
      default:
        return 'wa-chip wa-chip--neutral';
    }
  }

  workflowClass(status: WorkflowStatus): string {
    switch (status) {
      case 'COMPLETED':
        return 'wa-chip wa-chip--success';
      case 'WAITING_APPROVAL':
        return 'wa-chip wa-chip--warning';
      case 'FAILED':
        return 'wa-chip wa-chip--danger';
      default:
        return 'wa-chip wa-chip--info';
    }
  }

  exchangeLabel(exchange: AgentExchange): string {
    return exchange.status === 'DELIVERED'
      ? 'Délivré'
      : exchange.status === 'PENDING'
        ? 'En attente'
        : 'Échec';
  }

  exchangeClass(exchange: AgentExchange): string {
    return exchange.status === 'DELIVERED'
      ? 'wa-chip wa-chip--success'
      : exchange.status === 'PENDING'
        ? 'wa-chip wa-chip--warning'
        : 'wa-chip wa-chip--danger';
  }

  when(value: string): string {
    return new Date(value).toLocaleString('fr-FR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
