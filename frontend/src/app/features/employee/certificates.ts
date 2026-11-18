import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EVALUATION_METHOD_LABELS, FORMAT_LABELS } from '../../core/models';
import { DataService } from '../../core/data/data.service';

@Component({
  selector: 'wa-certificates-page',
  imports: [RouterLink],
  styleUrl: '../pages.scss',
  template: `
    <div class="page">
      <header class="page-head">
        <div>
          <h1>Mes certificats</h1>
          <p>
            Un certificat est délivré uniquement après une évaluation réussie. Il porte la
            méthode utilisée, le score, le niveau avant et après, et les critères réellement
            validés. Aucun certificat n’est émis sur simple présence.
          </p>
        </div>
      </header>

      @if (certificates().length === 0) {
        <p class="empty">
          Aucun certificat pour l’instant. Terminez une formation, choisissez une méthode
          d’évaluation et réussissez-la.
        </p>
      } @else {
        <div class="cert-grid">
          @for (certificate of issued(); track certificate.id) {
            <article class="cert">
              <div class="cert__top">
                <span class="cert__id">{{ certificate.id }}</span>
                <span class="material-symbols-outlined cert__seal">workspace_premium</span>
              </div>
              <h2>{{ certificate.formationTitle }}</h2>
              <p class="cert__skill">{{ certificate.skillLabel }} · {{ formatLabels[certificate.format] }}</p>

              <div class="cert__score">
                <strong>{{ certificate.score }}</strong>
                <small>/ 100</small>
              </div>

              <div class="cert__levels">
                <span>Niveau {{ certificate.levelBefore }}</span>
                <span class="material-symbols-outlined">arrow_forward</span>
                <span>Niveau {{ certificate.levelAfter }}</span>
              </div>

              <p class="cert__method">{{ methodLabels[certificate.method] }}</p>

              <div class="cert__foot">
                <small>Délivré le {{ day(certificate.issuedAt) }} à {{ certificate.employeeName }}</small>
                <a class="btn btn--small btn--primary" [routerLink]="['/app/certificats', certificate.id]">
                  Ouvrir
                </a>
              </div>
            </article>
          }
        </div>

        <section class="panel">
          <h2>Comment un certificat est produit</h2>
          <div class="form-grid form-grid--3" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px">
            <div class="kv">
              <span>1. Formation terminée</span>
              <strong>Preuve de fin déposée</strong>
              <p class="wa-small wa-muted" style="margin: 4px 0 0">
                Toutes les unités, checkpoints et le livrable final sont exigés.
              </p>
            </div>
            <div class="kv">
              <span>2. Évaluation choisie puis réussie</span>
              <strong>Score ≥ seuil de la formation</strong>
              <p class="wa-small wa-muted" style="margin: 4px 0 0">
                Le seuil est défini par la formation, jamais par une constante globale.
              </p>
            </div>
            <div class="kv">
              <span>3. Résultat réinjecté</span>
              <strong>Écart recalculé</strong>
              <p class="wa-small wa-muted" style="margin: 4px 0 0">
                EVALUATION_RESULT met à jour le niveau réel et clôt l’écart.
              </p>
            </div>
          </div>
        </section>
      }
    </div>
  `,
  styles: [
    `
      .cert-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 14px;
      }
      .cert {
        position: relative;
        padding: 18px 20px;
        border-radius: var(--wa-radius);
        background:
          radial-gradient(circle at 90% 0%, rgba(124, 58, 237, 0.1), transparent 45%),
          #fff;
        border: 1px solid var(--wa-border);
        box-shadow: var(--wa-shadow);
      }
      .cert__top {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .cert__id {
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.06em;
        color: var(--wa-ink-faint);
      }
      .cert__seal {
        font-size: 26px;
        color: #7c3aed;
      }
      .cert h2 {
        margin: 10px 0 3px;
        font-size: 16px;
        line-height: 1.35;
      }
      .cert__skill {
        margin: 0;
        font-size: 11.5px;
        color: var(--wa-ink-soft);
      }
      .cert__score {
        display: flex;
        align-items: baseline;
        gap: 3px;
        margin: 12px 0 2px;
      }
      .cert__score strong {
        font-size: 30px;
        letter-spacing: -0.03em;
        color: var(--wa-primary-deep);
      }
      .cert__score small {
        font-size: 12px;
        color: var(--wa-ink-soft);
      }
      .cert__levels {
        display: flex;
        align-items: center;
        gap: 7px;
        font-size: 11.5px;
        font-weight: 600;
        color: var(--wa-ink-soft);
      }
      .cert__levels .material-symbols-outlined {
        font-size: 15px;
      }
      .cert__method {
        margin: 10px 0 12px;
        display: inline-block;
        font-size: 10.5px;
        font-weight: 700;
        padding: 3px 9px;
        border-radius: 999px;
        background: var(--wa-violet-soft);
        color: #5b21b6;
      }
      .cert__foot {
        border-top: 1px dashed var(--wa-border);
        padding-top: 10px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 10px;
      }
      .cert__foot small {
        font-size: 10.5px;
        color: var(--wa-ink-faint);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CertificatesPage {
  private readonly data = inject(DataService);

  readonly certificates = this.data.certificates;
  readonly issued = this.data.issuedCertificates;
  readonly methodLabels = EVALUATION_METHOD_LABELS;
  readonly formatLabels = FORMAT_LABELS;

  day(value: string): string {
    return new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  }
}
