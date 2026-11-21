import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { DataService } from '../../core/data/data.service';

@Component({
  selector: 'wa-confidentiality-page',
  styleUrl: '../pages.scss',
  template: `
    <div class="page">
      <header class="page-head">
        <div>
          <h1>Confidentialité et usage des données</h1>
          <p>
            WorkAdapt AI collecte des données professionnelles pour produire un diagnostic de
            compétences. Cette page décrit ce qui est collecté, pourquoi, qui peut le voir et
            comment le retirer. Aucune donnée n’est utilisée pour évaluer une personne en dehors
            de la finalité de développement des compétences.
          </p>
        </div>
        <div class="page-head__actions">
          <span class="wa-chip wa-chip--success">Consentement {{ consent() ? 'actif' : 'retiré' }}</span>
        </div>
      </header>

      <div class="split">
        <div style="display: flex; flex-direction: column; gap: 18px">
          <section class="panel">
            <h2>Ce qui est collecté</h2>
            <p class="panel__sub">
              Seules les sources autorisées sont utilisées. Chaque événement porte sa source, son
              horodatage et un niveau de confiance.
            </p>
            <div class="list">
              @for (source of sources(); track source.code) {
                <div class="row" style="align-items: flex-start">
                  <span class="icon-round material-symbols-outlined">database</span>
                  <div class="row__main">
                    <strong>{{ source.label }}</strong>
                    <p>{{ source.description }}</p>
                  </div>
                  <span class="wa-chip" [class]="source.status === 'CONNECTED' ? 'wa-chip wa-chip--success' : 'wa-chip wa-chip--neutral'">
                    {{ statusLabel(source.status) }}
                  </span>
                </div>
              }
            </div>
          </section>

          <section class="panel">
            <h2>Ce qui n’est jamais fait</h2>
            <ul class="rules">
              <li>Aucune capture d’écran permanente, aucun enregistrement de frappe.</li>
              <li>Aucune lecture des messages privés, fichiers personnels ou navigation hors périmètre professionnel.</li>
              <li>Aucun niveau de compétence inventé : une donnée déclarée n’est jamais présentée comme observée.</li>
              <li>Aucune décision de sanction, de licenciement ou de promotion prise automatiquement.</li>
              <li>Aucun accès RH aux données nominatives individuelles : les vues RH sont agrégées.</li>
            </ul>
          </section>

          <section class="panel">
            <h2>Qui voit quoi</h2>
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Donnée</th>
                    <th>Employé</th>
                    <th>Superviseur</th>
                    <th>RH</th>
                    <th>Admin</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Profil nominatif</td>
                    <td>Lecture / écriture</td>
                    <td>Avec consentement</td>
                    <td>Non</td>
                    <td>Technique</td>
                  </tr>
                  <tr>
                    <td>Écarts et niveaux</td>
                    <td>Lecture</td>
                    <td>Équipe encadrée</td>
                    <td>Agrégé</td>
                    <td>Non nominatif</td>
                  </tr>
                  <tr>
                    <td>Parcours et décisions</td>
                    <td>Lecture</td>
                    <td>Lecture / décision</td>
                    <td>Agrégé</td>
                    <td>Journal</td>
                  </tr>
                  <tr>
                    <td>Évaluations et certificats</td>
                    <td>Lecture</td>
                    <td>Résultat</td>
                    <td>Agrégé</td>
                    <td>Journal</td>
                  </tr>
                  <tr>
                    <td>Journal d’audit</td>
                    <td>Non</td>
                    <td>Non</td>
                    <td>Non</td>
                    <td>Lecture</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section class="panel">
            <h2>Durées et droits</h2>
            <div class="kv-grid">
              <div class="kv">
                <span>Données de collecte</span>
                <strong>24 mois</strong>
                <p class="wa-small wa-muted" style="margin: 4px 0 0">
                  Puis agrégation et suppression des détails.
                </p>
              </div>
              <div class="kv">
                <span>Évaluations</span>
                <strong>36 mois</strong>
                <p class="wa-small wa-muted" style="margin: 4px 0 0">
                  Conservées comme preuve de certification.
                </p>
              </div>
              <div class="kv">
                <span>Journal d’audit</span>
                <strong>12 mois</strong>
                <p class="wa-small wa-muted" style="margin: 4px 0 0">
                  Accès et décisions tracés, horodatés.
                </p>
              </div>
            </div>
            <ul class="rules" style="margin-top: 12px">
              <li>Droit d’accès : exporter votre profil et vos preuves.</li>
              <li>Droit de rectification : corriger une donnée déclarée inexacte.</li>
              <li>Droit de retrait : couper la collecte, ce qui suspend le diagnostic.</li>
              <li>Droit d’opposition : refuser le partage avec le superviseur, sans perte de certificat déjà obtenu.</li>
            </ul>
          </section>
        </div>

        <div style="display: flex; flex-direction: column; gap: 18px">
          <section class="panel">
            <h2>Vos consentements</h2>
            <div class="checks">
              <label class="check">
                <input type="checkbox" [checked]="consent()" (change)="toggleConsent($any($event.target).checked)" />
                <span>
                  <strong>Collecte permanente</strong><br />
                  <span class="wa-small wa-muted">
                    Nécessaire pour détecter les écarts et suivre la progression. Son retrait
                    suspend le diagnostic et le parcours en cours.
                  </span>
                </span>
              </label>
              <label class="check">
                <input type="checkbox" [checked]="share()" (change)="toggleShare($any($event.target).checked)" />
                <span>
                  <strong>Partage avec le superviseur</strong><br />
                  <span class="wa-small wa-muted">
                    Permet à votre superviseur de suivre votre progression et vos résultats.
                    Son retrait lui cache votre parcours et vos résultats ; la validation de la
                    demande reste possible.
                  </span>
                </span>
              </label>
            </div>
            <p class="note" style="margin-top: 10px">
              Retirer un consentement prend effet immédiatement. Les parcours en cours sont
              suspendus, pas supprimés, afin de conserver la traçabilité.
            </p>
          </section>

          <section class="panel">
            <h2>Transparence de l’IA</h2>
            <p class="panel__sub" style="margin-bottom: 10px">
              Chaque conclusion de l’IA est séparée des faits qui la fondent. Une inférence peut
              être contestée : le désaccord est conservé dans l’audit.
            </p>
            <ul class="rules">
              <li>Les faits observés portent leur source et leur date.</li>
              <li>Les déclarations sont marquées comme déclaratives.</li>
              <li>Les décisions de validation restent humaines.</li>
            </ul>
          </section>

          <section class="panel">
            <h2>Contact</h2>
            <p class="panel__sub" style="margin-bottom: 0">
              Pour toute demande d’accès, de rectification ou de suppression :
              <strong>dpo&#64;workadapt.demo</strong>. Une réponse est apportée sous 30 jours.
              Les demandes sont journalisées et ne peuvent pas être supprimées par un
              administrateur.
            </p>
          </section>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .rules {
        margin: 0;
        padding-left: 18px;
        font-size: 12.5px;
        line-height: 1.7;
        color: var(--wa-ink-soft);
      }
      .checks {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfidentialityPage {
  private readonly data = inject(DataService);

  readonly sources = this.data.dataSources;
  readonly consent = computed(() => this.data.profile().consent.collect);
  readonly share = computed(() => this.data.profile().consent.shareWithSupervisor);

  toggleConsent(value: boolean): void {
    this.data.updateProfile({
      consent: { ...this.data.profile().consent, collect: value, at: new Date().toISOString() },
    });
  }

  toggleShare(value: boolean): void {
    this.data.updateProfile({
      consent: { ...this.data.profile().consent, shareWithSupervisor: value, at: new Date().toISOString() },
    });
  }

  statusLabel(status: string): string {
    return status === 'CONNECTED' ? 'Connectée' : status === 'PARTIAL' ? 'Partielle' : 'Non connectée';
  }
}
