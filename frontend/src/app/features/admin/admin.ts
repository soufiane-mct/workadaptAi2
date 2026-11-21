import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Kpi, ROLE_LABELS } from '../../core/models';
import { DataService } from '../../core/data/data.service';

@Component({
  selector: 'wa-admin-page',
  imports: [RouterLink],
  styleUrl: '../pages.scss',
  template: `
    <div class="page">
      <header class="page-head">
        <div>
          <h1>Administration du système</h1>
          <p>
            Vue technique de la plateforme : comptes, sources de collecte, agents, journal et
            paramètres de démonstration. L’administrateur ne peut ni modifier un niveau de
            compétence, ni valider un parcours, ni délivrer un certificat.
          </p>
        </div>
        <div class="page-head__actions">
          <span class="wa-chip wa-chip--info">{{ kpisOnTarget() }} / {{ kpis().length }} KPI dans la cible</span>
          <a class="btn" routerLink="/app/agents">
            <span class="material-symbols-outlined">smart_toy</span>
            Agents IA
          </a>
          <a class="btn" routerLink="/app/rh/audit">
            <span class="material-symbols-outlined">history</span>
            Journal d’audit
          </a>
        </div>
      </header>

      @if (message()) {
        <p class="note note--ok">{{ message() }}</p>
      }

      <div class="stat-grid">
        <div class="stat">
          <span>Comptes</span>
          <strong>{{ accounts().length }}</strong>
          <small>Identités et rôles uniquement</small>
        </div>
        <div class="stat">
          <span>Sources connectées</span>
          <strong>{{ connectedSources() }} / {{ sources().length }}</strong>
          <small>Collecte permanente</small>
        </div>
        <div class="stat">
          <span>Agents sains</span>
          <strong>{{ healthyAgents() }} / {{ agents().length }}</strong>
          <small>Aucun agent en erreur silencieuse</small>
        </div>
        <div class="stat">
          <span>Traces d’audit</span>
          <strong>{{ audit().length }}</strong>
          <small>Conservées 12 mois</small>
        </div>
      </div>

      <div class="split">
        <div style="display: flex; flex-direction: column; gap: 18px">
          <section class="panel">
            <h2>État des sources de collecte</h2>
            <p class="panel__sub">
              Une source partielle ne bloque pas la collecte : elle réduit la confiance des
              niveaux estimés et doit rester visible.
            </p>
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Source</th>
                    <th>Rôle</th>
                    <th>État</th>
                    <th>Dernière synchro</th>
                    <th>Éléments</th>
                  </tr>
                </thead>
                <tbody>
                  @for (source of sources(); track source.code) {
                    <tr>
                      <td><strong>{{ source.label }}</strong></td>
                      <td class="wa-small wa-muted">{{ source.description }}</td>
                      <td>
                        <span class="wa-chip" [class]="sourceClass(source.status)">
                          {{ sourceLabel(source.status) }}
                        </span>
                      </td>
                      <td class="wa-small">{{ source.lastSync ? when(source.lastSync) : '—' }}</td>
                      <td>{{ source.records ?? 0 }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </section>

          <section class="panel">
            <h2>Indicateurs du système</h2>
            <p class="panel__sub">
              Les 13 KPI du CDC sont suivis en continu. Un KPI hors cible n’est pas corrigé
              manuellement : il déclenche une analyse.
            </p>
            <div class="kpi-list">
              @for (kpi of kpis(); track kpi.code) {
                <div class="kpi-line">
                  <div class="kpi-line__main">
                    <strong>{{ kpi.label }}</strong>
                    <small>{{ kpi.definition }}</small>
                  </div>
                  <div class="kpi-line__value" [class.kpi-line__value--off]="!isOnTarget(kpi)">
                    {{ kpi.current }}{{ unit(kpi) }}
                    <small>cible {{ kpi.target }}{{ unit(kpi) }}</small>
                  </div>
                </div>
              }
            </div>
          </section>

          <section class="panel">
            <h2>Comptes et rôles</h2>
            <p class="panel__sub">
              L’annuaire administratif ne contient ni niveau de compétence, ni écart, ni
              résultat d’évaluation. Ces données restent dans leurs domaines respectifs.
            </p>
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Nom</th>
                    <th>E-mail</th>
                    <th>Rôle</th>
                    <th>Poste</th>
                    <th>Département</th>
                  </tr>
                </thead>
                <tbody>
                  @for (account of accounts(); track account.id) {
                    <tr>
                      <td>
                        <span class="account">
                          <span class="account__initials">{{ account.initials }}</span>
                          <strong>{{ account.name }}</strong>
                        </span>
                      </td>
                      <td class="wa-small">{{ account.email }}</td>
                      <td><span class="wa-chip wa-chip--neutral">{{ roleLabels[account.role] }}</span></td>
                      <td class="wa-small">{{ account.jobTitle }}</td>
                      <td class="wa-small">{{ account.department }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <div style="display: flex; flex-direction: column; gap: 18px">
          <section class="panel">
            <h2>Paramètres</h2>
            <div class="setting">
              <div>
                <strong>Mode démonstration</strong>
                <p class="wa-small wa-muted">
                  Compression du temps (facteur ×20) pour dérouler la boucle complète. Les
                  conditions de fin restent réelles : la durée des unités est créditée. Hors
                  ce mode, le contrôle de cohérence temporelle des preuves s’applique.
                </p>
              </div>
              <label class="switch">
                <input type="checkbox" [checked]="demoMode()" (change)="toggleDemo($any($event.target).checked)" />
                <span></span>
              </label>
            </div>
            <div class="setting">
              <div>
                <strong>Collecte permanente</strong>
                <p class="wa-small wa-muted">
                  La collecte ne peut pas être arrêtée par l’administrateur. Seul l’employé peut
                  retirer son consentement ; les parcours en cours sont alors suspendus.
                </p>
              </div>
              <span class="wa-chip wa-chip--success">Toujours active</span>
            </div>
            <div class="setting">
              <div>
                <strong>Validation des parcours</strong>
                <p class="wa-small wa-muted">
                  Décision réservée au superviseur. Aucun rôle technique ne peut approuver un
                  curriculum.
                </p>
              </div>
              <span class="wa-chip wa-chip--warning">Humaine uniquement</span>
            </div>
            <div class="setting">
              <div>
                <strong>Données de démonstration</strong>
                <p class="wa-small wa-muted">
                  Rétablit le jeu initial de cette démonstration dans le navigateur. Les comptes,
                  la session et les accès restent disponibles ; toutes les données de travail sont
                  remplacées.
                </p>
              </div>
              <button class="btn btn--danger" type="button" (click)="resetDemo()">
                <span class="material-symbols-outlined">restart_alt</span>
                Rétablir les données
              </button>
            </div>
            <div class="setting">
              <div>
                <strong>Certification</strong>
                <p class="wa-small wa-muted">
                  Un certificat exige une évaluation réussie au seuil de la formation. Aucune
                  dérogation administrative.
                </p>
              </div>
              <span class="wa-chip wa-chip--neutral">Conditionnelle</span>
            </div>
          </section>

          <section class="panel">
            <h2>Limites techniques</h2>
            <div class="limits">
              <div>
                <span>Budget de style par composant</span>
                <strong>14 kB avertissement · 20 kB erreur</strong>
                <small>Vérifié à chaque construction.</small>
              </div>
              <div>
                <span>Persistance</span>
                <strong>Simulée dans le navigateur</strong>
                <small>Comptes, session et espaces collaborateur dans le navigateur ; une future API remplacera ce stockage.</small>
              </div>
              <div>
                <span>Données métier</span>
                <strong>Services typés</strong>
                <small>Aucune donnée métier écrite dans les composants.</small>
              </div>
              <div>
                <span>Exports</span>
                <strong>CSV / PDF simulés et étiquetés</strong>
                <small>Aucun export réel n’est produit sans service serveur.</small>
              </div>
            </div>
          </section>

          <section class="panel">
            <h2>Dernières traces</h2>
            <div class="traces">
              @for (entry of audit().slice(0, 6); track entry.id) {
                <div class="trace">
                  <strong>{{ entry.action }}</strong>
                  <p>{{ entry.detail }}</p>
                  <small>{{ entry.actor }} · {{ when(entry.at) }} · {{ entry.ip }}</small>
                </div>
              }
            </div>
          </section>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .kpi-list {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .kpi-line {
        display: flex;
        justify-content: space-between;
        gap: 14px;
        align-items: flex-start;
        padding: 8px 10px;
        border-radius: 9px;
        background: var(--wa-surface-2);
      }
      .kpi-line__main strong {
        display: block;
        font-size: 12px;
      }
      .kpi-line__main small {
        font-size: 10.5px;
        line-height: 1.4;
        color: var(--wa-ink-soft);
      }
      .kpi-line__value {
        flex: none;
        text-align: right;
        font-size: 15px;
        font-weight: 700;
        color: #0a6b3d;
      }
      .kpi-line__value--off {
        color: #a21c12;
      }
      .kpi-line__value small {
        display: block;
        font-size: 9.5px;
        font-weight: 600;
        color: var(--wa-ink-faint);
      }
      .account {
        display: inline-flex;
        align-items: center;
        gap: 7px;
      }
      .account__initials {
        width: 24px;
        height: 24px;
        flex: none;
        border-radius: 7px;
        background: var(--wa-primary-soft);
        color: var(--wa-primary-deep);
        display: grid;
        place-items: center;
        font-size: 9.5px;
        font-weight: 700;
      }
      .setting {
        display: flex;
        justify-content: space-between;
        gap: 14px;
        align-items: flex-start;
        padding: 11px 0;
        border-bottom: 1px dashed var(--wa-border);
      }
      .setting:last-child {
        border-bottom: none;
      }
      .setting strong {
        font-size: 12.5px;
      }
      .setting p {
        margin: 3px 0 0;
        max-width: 38ch;
      }
      .switch {
        position: relative;
        flex: none;
        width: 42px;
        height: 23px;
        cursor: pointer;
      }
      .switch input {
        opacity: 0;
        width: 0;
        height: 0;
      }
      .switch span {
        position: absolute;
        inset: 0;
        border-radius: 999px;
        background: #cbd5e1;
        transition: background 0.18s;
      }
      .switch span::before {
        content: '';
        position: absolute;
        top: 3px;
        left: 3px;
        width: 17px;
        height: 17px;
        border-radius: 50%;
        background: #fff;
        transition: transform 0.18s;
      }
      .switch input:checked + span {
        background: var(--wa-primary);
      }
      .switch input:checked + span::before {
        transform: translateX(19px);
      }
      .limits {
        display: grid;
        gap: 8px;
      }
      .limits div {
        padding: 9px 11px;
        border-radius: 10px;
        background: var(--wa-surface-2);
      }
      .limits span {
        display: block;
        font-size: 9.5px;
        text-transform: uppercase;
        letter-spacing: 0.07em;
        font-weight: 700;
        color: var(--wa-ink-faint);
      }
      .limits strong {
        display: block;
        font-size: 12px;
      }
      .limits small {
        font-size: 10.5px;
        line-height: 1.4;
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
export class AdminPage {
  private readonly data = inject(DataService);

  readonly accounts = this.data.accounts;
  readonly sources = this.data.dataSources;
  readonly agents = computed(() => this.data.agents);
  readonly kpis = computed(() => this.data.kpis);
  readonly roleLabels = ROLE_LABELS;
  readonly demoMode = this.data.demoMode;
  readonly audit = this.data.auditEntries;

  readonly message = signal('');

  readonly connectedSources = computed(
    () => this.sources().filter((source) => source.status === 'CONNECTED').length,
  );
  readonly healthyAgents = computed(
    () => this.agents().filter((agent) => agent.health !== 'ERROR').length,
  );
  readonly kpisOnTarget = computed(() => this.kpis().filter((kpi) => this.isOnTarget(kpi)).length);

  toggleDemo(value: boolean): void {
    this.data.setDemoMode(value);
    this.message.set(
      value
        ? 'Mode démonstration activé : le temps est compressé (×20). Les conditions de fin restent réelles.'
        : 'Mode démonstration désactivé : le temps réel des unités s’applique.',
    );
  }

  /**
   * Rétablit le jeu de démonstration après une confirmation explicite.
   *
   * Les comptes et la session sont conservés : la confirmation porte
   * uniquement sur les données de travail de la démonstration.
   */
  resetDemo(): void {
    const confirmed = window.confirm(
      'Rétablir toutes les données de démonstration ? Les comptes et la session de ce navigateur seront conservés.',
    );
    if (!confirmed) {
      this.message.set('La réinitialisation a été annulée : les données sont inchangées.');
      return;
    }

    this.data.resetDemo();
    this.message.set(
      'Les données de démonstration ont été rétablies. Les comptes et la session restent disponibles.',
    );
  }

  isOnTarget(kpi: Kpi): boolean {
    return kpi.direction === 'UP' ? kpi.current >= kpi.target : kpi.current <= kpi.target;
  }

  unit(kpi: Kpi): string {
    switch (kpi.unit) {
      case 'PERCENT':
        return ' %';
      case 'POINTS':
        return ' pts';
      case 'MINUTES':
        return ' min';
      case 'SECONDS':
        return ' s';
      default:
        return '';
    }
  }

  sourceLabel(status: 'CONNECTED' | 'PARTIAL' | 'NOT_CONNECTED'): string {
    return status === 'CONNECTED'
      ? 'Connectée'
      : status === 'PARTIAL'
        ? 'Partielle'
        : 'Non connectée';
  }

  sourceClass(status: 'CONNECTED' | 'PARTIAL' | 'NOT_CONNECTED'): string {
    return status === 'CONNECTED'
      ? 'wa-chip wa-chip--success'
      : status === 'PARTIAL'
        ? 'wa-chip wa-chip--warning'
        : 'wa-chip wa-chip--neutral';
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
