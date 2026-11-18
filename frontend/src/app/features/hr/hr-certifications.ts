import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  Certificate,
  EVALUATION_METHOD_LABELS,
  EVALUATION_METHODS,
  FORMAT_LABELS,
  TRAINING_FORMATS,
} from '../../core/models';
import { DataService } from '../../core/data/data.service';

interface SkillAggregate {
  skill: string;
  count: number;
  averageScore: number;
  methods: string[];
  formats: string[];
}

interface MethodAggregate {
  method: string;
  count: number;
  averageScore: number;
  share: number;
}

@Component({
  selector: 'wa-hr-certifications-page',
  imports: [RouterLink],
  styleUrl: '../pages.scss',
  template: `
    <div class="page">
      <header class="page-head">
        <div>
          <h1>Certifications agrégées</h1>
          <p>
            Volumes de certificats par compétence, méthode et format. Un certificat n’existe
            qu’après une évaluation réussie au seuil de la formation : il ne récompense pas une
            présence. Cette vue ne contient aucun nom ni identifiant employé.
          </p>
        </div>
        <div class="page-head__actions">
          <span class="wa-chip wa-chip--success">Agrégé · non nominatif</span>
          <a class="btn" routerLink="/app/rh/rapports">
            <span class="material-symbols-outlined">download</span>
            Exporter
          </a>
        </div>
      </header>

      <div class="stat-grid">
        <div class="stat">
          <span>Certificats délivrés</span>
          <strong>{{ certificates().length }}</strong>
          <small>Tous formats confondus</small>
        </div>
        <div class="stat">
          <span>Compétences couvertes</span>
          <strong>{{ skills().length }}</strong>
          <small>Au moins un certificat</small>
        </div>
        <div class="stat">
          <span>Méthodes utilisées</span>
          <strong>{{ usedMethods().length }} / {{ methods.length }}</strong>
          <small>Instrument choisi après la formation</small>
        </div>
        <div class="stat">
          <span>Score moyen</span>
          <strong>{{ averageScore() }}/100</strong>
          <small>Seuil défini par chaque formation</small>
        </div>
      </div>

      <div class="split">
        <div style="display: flex; flex-direction: column; gap: 18px">
          <section class="panel">
            <h2>Par compétence</h2>
            <p class="panel__sub">
              Le nombre de certificats et le score moyen sont agrégés. Un score moyen élevé ne
              signifie pas que la compétence est maîtrisée par toute l’organisation.
            </p>
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Compétence</th>
                    <th>Certificats</th>
                    <th>Score moyen</th>
                    <th>Méthodes</th>
                    <th>Formats</th>
                  </tr>
                </thead>
                <tbody>
                  @for (row of skills(); track row.skill) {
                    <tr>
                      <td><strong>{{ row.skill }}</strong></td>
                      <td>{{ row.count }}</td>
                      <td>
                        <div class="score">
                          <div class="bar"><span [style.width.%]="row.averageScore"></span></div>
                          <strong>{{ row.averageScore }}</strong>
                        </div>
                      </td>
                      <td>
                        <div class="chips">
                          @for (method of row.methods; track method) {
                            <span class="wa-chip wa-chip--info">{{ method }}</span>
                          }
                        </div>
                      </td>
                      <td>
                        <div class="chips">
                          @for (format of row.formats; track format) {
                            <span class="wa-chip wa-chip--neutral">{{ format }}</span>
                          }
                        </div>
                      </td>
                    </tr>
                  }
                  @if (skills().length === 0) {
                    <tr>
                      <td colspan="5" class="wa-muted">Aucun certificat délivré pour l’instant.</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </section>

          <section class="panel">
            <h2>Par méthode d’évaluation</h2>
            <p class="panel__sub">
              Les cinq méthodes sont des instruments distincts. Une méthode très utilisée ne rend
              pas les autres obsolètes.
            </p>
            <div class="method-grid">
              @for (row of methodsByUse(); track row.method) {
                <div class="method-card" [class.method-card--empty]="row.count === 0">
                  <div class="method-card__head">
                    <strong>{{ row.method }}</strong>
                    <span class="wa-chip" [class]="row.count > 0 ? 'wa-chip wa-chip--success' : 'wa-chip wa-chip--neutral'">
                      {{ row.count }}
                    </span>
                  </div>
                  <div class="bar" style="margin: 6px 0 4px">
                    <span [style.width.%]="row.share"></span>
                  </div>
                  <small>{{ row.count === 0 ? 'Méthode disponible, non encore utilisée' : 'Score moyen ' + row.averageScore + '/100' }}</small>
                </div>
              }
            </div>
          </section>

          <section class="panel">
            <h2>Par format de formation</h2>
            <div class="format-bars">
              @for (row of formatsByUse(); track row.format) {
                <div class="format-bar">
                  <span class="format-bar__label">{{ row.label }}</span>
                  <div class="bar"><span [style.width.%]="row.share"></span></div>
                  <strong>{{ row.count }}</strong>
                </div>
              }
            </div>
          </section>
        </div>

        <div style="display: flex; flex-direction: column; gap: 18px">
          <section class="panel">
            <h2>Chronologie</h2>
            <p class="panel__sub">Délivrances regroupées par mois.</p>
            <div class="timeline">
              @for (month of timeline(); track month.key) {
                <div class="timeline__row">
                  <span class="timeline__dot"></span>
                  <div class="timeline__main">
                    <strong>{{ month.label }}</strong>
                    <small>{{ month.count }} certificat(s) · score moyen {{ month.averageScore }}/100</small>
                  </div>
                  <div class="timeline__bar">
                    <span [style.width.%]="month.share"></span>
                  </div>
                </div>
              }
              @if (timeline().length === 0) {
                <p class="empty">Aucune délivrance enregistrée.</p>
              }
            </div>
          </section>

          <section class="panel">
            <h2>Règle de délivrance</h2>
            <ol class="rules">
              <li>Formation terminée : toutes les unités, checkpoints et preuve de fin validés.</li>
              <li>Méthode d’évaluation choisie par l’employé après la formation.</li>
              <li>Épreuve générée depuis la formation, passée, puis corrigée par l’IA.</li>
              <li>Score supérieur ou égal au seuil propre à la formation.</li>
              <li>Niveau mis à jour et événement réinjecté dans la collecte.</li>
            </ol>
            <p class="note" style="margin-top: 10px">
              Un échec ne produit aucun certificat : il crée une remédiation, c’est-à-dire une
              nouvelle demande de formation soumise à validation.
            </p>
          </section>

          <section class="panel">
            <h2>Limites de lecture</h2>
            <ul class="rules rules--danger">
              <li>Un certificat ne couvre pas les compétences voisines.</li>
              <li>Il n’est pas une habilitation réglementaire.</li>
              <li>Il peut être remis en cause si le niveau baisse durablement.</li>
              <li>Il ne permet pas de comparer deux employés.</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .score {
        display: flex;
        align-items: center;
        gap: 7px;
        min-width: 110px;
      }
      .score .bar {
        flex: 1;
      }
      .score strong {
        font-size: 11.5px;
      }
      .method-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
        gap: 8px;
      }
      .method-card {
        padding: 10px 12px;
        border-radius: 11px;
        border: 1px solid var(--wa-border);
        background: #fff;
      }
      .method-card--empty {
        background: var(--wa-surface-2);
      }
      .method-card__head {
        display: flex;
        justify-content: space-between;
        gap: 8px;
        align-items: flex-start;
      }
      .method-card__head strong {
        font-size: 11.5px;
        line-height: 1.35;
      }
      .method-card small {
        font-size: 10px;
        color: var(--wa-ink-soft);
      }
      .format-bars {
        display: flex;
        flex-direction: column;
        gap: 7px;
      }
      .format-bar {
        display: grid;
        grid-template-columns: 84px 1fr 24px;
        gap: 9px;
        align-items: center;
        font-size: 11.5px;
      }
      .format-bar strong {
        text-align: right;
      }
      .timeline {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .timeline__row {
        display: flex;
        gap: 9px;
        align-items: center;
      }
      .timeline__dot {
        width: 9px;
        height: 9px;
        flex: none;
        border-radius: 50%;
        background: var(--wa-primary);
      }
      .timeline__main {
        flex: none;
        width: 96px;
      }
      .timeline__main strong {
        display: block;
        font-size: 11.5px;
      }
      .timeline__main small {
        font-size: 9.5px;
        color: var(--wa-ink-faint);
      }
      .timeline__bar {
        flex: 1;
        height: 7px;
        border-radius: 999px;
        background: var(--wa-surface-3);
        overflow: hidden;
      }
      .timeline__bar span {
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
      .rules--danger li {
        color: #a21c12;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HrCertificationsPage {
  private readonly data = inject(DataService);

  readonly certificates = this.data.issuedCertificates;
  readonly methods = EVALUATION_METHODS.map((method) => EVALUATION_METHOD_LABELS[method]);
  readonly formatLabels = FORMAT_LABELS;

  readonly averageScore = computed(() => {
    const certificates = this.certificates();
    return certificates.length === 0
      ? 0
      : Math.round(certificates.reduce((sum, cert) => sum + cert.score, 0) / certificates.length);
  });

  readonly usedMethods = computed(() => [
    ...new Set(this.certificates().map((cert) => EVALUATION_METHOD_LABELS[cert.method])),
  ]);

  readonly skills = computed<SkillAggregate[]>(() => {
    const grouped = new Map<string, Certificate[]>();
    for (const cert of this.certificates()) {
      grouped.set(cert.skillLabel, [...(grouped.get(cert.skillLabel) ?? []), cert]);
    }
    return [...grouped.entries()]
      .map(([skill, certs]) => ({
        skill,
        count: certs.length,
        averageScore: Math.round(certs.reduce((sum, cert) => sum + cert.score, 0) / certs.length),
        methods: [...new Set(certs.map((cert) => EVALUATION_METHOD_LABELS[cert.method]))],
        formats: [...new Set(certs.map((cert) => FORMAT_LABELS[cert.format]))],
      }))
      .sort((a, b) => b.count - a.count || a.skill.localeCompare(b.skill));
  });

  readonly methodsByUse = computed<MethodAggregate[]>(() => {
    const total = Math.max(1, this.certificates().length);
    return EVALUATION_METHODS.map((method) => {
      const certs = this.certificates().filter((cert) => cert.method === method);
      return {
        method: EVALUATION_METHOD_LABELS[method],
        count: certs.length,
        averageScore:
          certs.length === 0
            ? 0
            : Math.round(certs.reduce((sum, cert) => sum + cert.score, 0) / certs.length),
        share: Math.round((certs.length / total) * 100),
      };
    });
  });

  readonly formatsByUse = computed(() => {
    const total = Math.max(1, this.certificates().length);
    return TRAINING_FORMATS.map((format) => {
      const count = this.certificates().filter((cert) => cert.format === format).length;
      return {
        format,
        label: FORMAT_LABELS[format],
        count,
        share: Math.round((count / total) * 100),
      };
    });
  });

  readonly timeline = computed(() => {
    const grouped = new Map<string, Certificate[]>();
    for (const cert of this.certificates()) {
      const key = cert.issuedAt.slice(0, 7);
      grouped.set(key, [...(grouped.get(key) ?? []), cert]);
    }
    const max = Math.max(1, ...[...grouped.values()].map((certs) => certs.length));
    return [...grouped.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([key, certs]) => ({
        key,
        label: new Date(`${key}-01`).toLocaleDateString('fr-FR', {
          month: 'long',
          year: 'numeric',
        }),
        count: certs.length,
        averageScore: Math.round(certs.reduce((sum, cert) => sum + cert.score, 0) / certs.length),
        share: Math.round((certs.length / max) * 100),
      }));
  });
}
