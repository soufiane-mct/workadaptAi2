import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EVALUATION_METHOD_LABELS, FORMAT_LABELS } from '../../core/models';
import { DataService } from '../../core/data/data.service';

@Component({
  selector: 'wa-certificate-detail',
  imports: [RouterLink],
  styleUrl: '../pages.scss',
  template: `
    @if (certificate(); as cert) {
      <div class="page">
        <header class="page-head">
          <div>
            <a class="wa-small" routerLink="/app/certificats" style="color: var(--wa-primary-deep); font-weight: 600">
              ← Mes certificats
            </a>
            <h1 style="margin-top: 6px">Certificat {{ cert.id }}</h1>
            <p>
              Délivré par WorkAdapt AI après une évaluation réussie. Ce document atteste d’un
              niveau démontré, pas d’une simple présence en formation.
            </p>
          </div>
          <div class="page-head__actions">
            <button class="btn" type="button" (click)="print()">
              <span class="material-symbols-outlined">print</span>
              Imprimer / PDF (simulé)
            </button>
          </div>
        </header>

        <article class="award">
          <div class="award__watermark">WORKADAPT AI</div>
          <div class="award__head">
            <span class="award__seal material-symbols-outlined">workspace_premium</span>
            <div>
              <span class="award__eyebrow">Certificat de compétence</span>
              <strong class="award__id">{{ cert.id }}</strong>
            </div>
          </div>

          <p class="award__intro">Ce certificat est décerné à</p>
          <h2 class="award__name">{{ cert.employeeName }}</h2>
          <p class="award__intro">pour la formation</p>
          <h3 class="award__formation">{{ cert.formationTitle }}</h3>
          <p class="award__skill">{{ cert.skillLabel }} · {{ formatLabels[cert.format] }}</p>

          <div class="award__score">
            <div>
              <span>Score final</span>
              <strong>{{ cert.score }}<small>/100</small></strong>
            </div>
            <div>
              <span>Méthode d’évaluation</span>
              <strong class="award__method">{{ methodLabels[cert.method] }}</strong>
            </div>
            <div>
              <span>Niveau démontré</span>
              <strong>{{ cert.levelBefore }} → {{ cert.levelAfter }}<small>/100</small></strong>
            </div>
          </div>

          <div class="award__criteria">
            <span class="award__criteria-title">Critères validés à la correction</span>
            <ul>
              @for (criterion of cert.criteriaValidated; track criterion) {
                <li>
                  <span class="material-symbols-outlined">check_circle</span>
                  {{ criterion }}
                </li>
              }
            </ul>
          </div>

          <div class="award__foot">
            <div>
              <span>Date de délivrance</span>
              <strong>{{ day(cert.issuedAt) }}</strong>
            </div>
            <div>
              <span>Vérification</span>
              <strong class="wa-mono">{{ verification(cert.id) }}</strong>
            </div>
          </div>
        </article>

        <div class="split">
          <section class="panel">
            <h2>Traçabilité du certificat</h2>
            <p class="panel__sub">
              Chaque certificat renvoie à la formation suivie, à l’évaluation passée et aux
              événements réinjectés dans la collecte.
            </p>
            <div class="list">
              <a class="row" [routerLink]="['/app/formations', cert.requestId]">
                <span class="icon-round material-symbols-outlined">school</span>
                <div class="row__main">
                  <strong>Formation source</strong>
                  <p>{{ cert.formationTitle }} — parcours complet validé par le superviseur.</p>
                </div>
                <span class="material-symbols-outlined">chevron_right</span>
              </a>
              <a class="row" [routerLink]="['/app/evaluations', cert.requestId]">
                <span class="icon-round material-symbols-outlined">grading</span>
                <div class="row__main">
                  <strong>Évaluation</strong>
                  <p>{{ methodLabels[cert.method] }} · {{ cert.evaluationId }}</p>
                </div>
                <span class="material-symbols-outlined">chevron_right</span>
              </a>
              <a class="row" [routerLink]="['/app/ecarts', gapId()]">
                <span class="icon-round material-symbols-outlined">track_changes</span>
                <div class="row__main">
                  <strong>Écart correspondant</strong>
                  <p>{{ cert.skillLabel }} — clos après réinjection du résultat d’évaluation.</p>
                </div>
                <span class="material-symbols-outlined">chevron_right</span>
              </a>
            </div>
          </section>

          <section class="panel">
            <h2>Ce que ce certificat ne dit pas</h2>
            <p class="panel__sub" style="margin-bottom: 10px">
              Un certificat est daté et porte sur une compétence précise. Il ne garantit ni la
              maîtrise de compétences voisines, ni une validité permanente.
            </p>
            <ul class="limits">
              <li>Il ne remplace pas une habilitation réglementaire.</li>
              <li>Il ne prouve pas les compétences non évaluées.</li>
              <li>Une nouvelle évaluation peut le révoquer si le niveau baisse durablement.</li>
            </ul>
            <p class="note" style="margin-top: 10px">
              La veille technologique peut rouvrir un écart sur cette compétence : le certificat
              reste acquis, mais le niveau est réévalué.
            </p>
          </section>
        </div>
      </div>
    } @else {
      <div class="page">
        <p class="empty">
          Certificat introuvable. <a routerLink="/app/certificats">Retour à mes certificats</a>
        </p>
      </div>
    }
  `,
  styles: [
    `
      .award {
        position: relative;
        overflow: hidden;
        padding: 30px 34px;
        border-radius: var(--wa-radius-lg);
        border: 1px solid #dcd3f4;
        background:
          radial-gradient(circle at 88% 6%, rgba(124, 58, 237, 0.12), transparent 42%),
          radial-gradient(circle at 4% 96%, rgba(47, 84, 235, 0.1), transparent 40%),
          #fffdfa;
        box-shadow: var(--wa-shadow);
      }
      .award__watermark {
        position: absolute;
        right: -20px;
        bottom: -14px;
        font-size: 76px;
        font-weight: 800;
        letter-spacing: -0.04em;
        color: rgba(124, 58, 237, 0.06);
        pointer-events: none;
      }
      .award__head {
        display: flex;
        align-items: center;
        gap: 14px;
        padding-bottom: 14px;
        border-bottom: 2px solid #141b2d;
      }
      .award__seal {
        font-size: 42px;
        color: #7c3aed;
      }
      .award__eyebrow {
        display: block;
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.18em;
        color: var(--wa-ink-faint);
        font-weight: 700;
      }
      .award__id {
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-size: 16px;
        letter-spacing: 0.04em;
      }
      .award__intro {
        margin: 18px 0 2px;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        color: var(--wa-ink-faint);
      }
      .award__name {
        margin: 0;
        font-size: 30px;
        letter-spacing: -0.03em;
      }
      .award__formation {
        margin: 0;
        font-size: 21px;
        line-height: 1.3;
        color: var(--wa-primary-deep);
      }
      .award__skill {
        margin: 4px 0 0;
        font-size: 12.5px;
        color: var(--wa-ink-soft);
      }
      .award__score {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 12px;
        margin: 22px 0;
        padding: 16px 0;
        border-top: 1px dashed #d8cdec;
        border-bottom: 1px dashed #d8cdec;
      }
      .award__score span {
        display: block;
        font-size: 9.5px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--wa-ink-faint);
        font-weight: 700;
      }
      .award__score strong {
        font-size: 24px;
        letter-spacing: -0.02em;
      }
      .award__score small {
        font-size: 11px;
        color: var(--wa-ink-soft);
      }
      .award__method {
        font-size: 15px !important;
      }
      .award__criteria-title {
        display: block;
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        color: var(--wa-ink-faint);
        font-weight: 700;
        margin-bottom: 8px;
      }
      .award__criteria ul {
        margin: 0;
        padding: 0;
        list-style: none;
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
        gap: 6px;
      }
      .award__criteria li {
        display: flex;
        gap: 7px;
        align-items: flex-start;
        font-size: 12px;
        line-height: 1.45;
      }
      .award__criteria .material-symbols-outlined {
        font-size: 16px;
        color: #0f9d58;
      }
      .award__foot {
        display: flex;
        justify-content: space-between;
        gap: 18px;
        flex-wrap: wrap;
        margin-top: 22px;
        padding-top: 14px;
        border-top: 2px solid #141b2d;
      }
      .award__foot span {
        display: block;
        font-size: 9.5px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--wa-ink-faint);
        font-weight: 700;
      }
      .award__foot strong {
        font-size: 12.5px;
      }
      .limits {
        margin: 0;
        padding-left: 18px;
        font-size: 12.5px;
        line-height: 1.7;
        color: var(--wa-ink-soft);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CertificateDetail {
  private readonly data = inject(DataService);

  readonly id = input.required<string>();

  readonly certificate = computed(() => this.data.certificateById(this.id()));
  readonly methodLabels = EVALUATION_METHOD_LABELS;
  readonly formatLabels = FORMAT_LABELS;

  readonly gapId = computed(() => {
    const cert = this.certificate();
    const request = cert ? this.data.requestById(cert.requestId) : undefined;
    return request?.gapId ?? '';
  });

  print(): void {
    window.print();
  }

  verification(id: string): string {
    return `WA-${id.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()}-${new Date(
      this.certificate()?.issuedAt ?? Date.now(),
    ).getFullYear()}`;
  }

  day(value: string): string {
    return new Date(value).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  }
}
