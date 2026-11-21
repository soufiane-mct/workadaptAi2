import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EVALUATION_METHOD_LABELS, SKILL_SOURCE_LABELS, TeamMember } from '../../core/models';
import { DataService } from '../../core/data/data.service';
import { SkillBar } from '../../shared/ui/skill-bar';

@Component({
  selector: 'wa-team-page',
  imports: [RouterLink, SkillBar],
  styleUrl: '../pages.scss',
  template: `
    <div class="page">
      <header class="page-head">
        <div>
          <h1>Mon équipe</h1>
          <p>
            Vue de pilotage pour le superviseur : avancement, compétences suivies et dernières
            évaluations. Ce n’est pas un outil de classement : chaque niveau indique sa source et
            sa confiance.
          </p>
        </div>
        <div class="page-head__actions">
          <a class="btn" routerLink="/app/validations">
            <span class="material-symbols-outlined">fact_check</span>
            Validations
          </a>
        </div>
      </header>

      <div class="stat-grid">
        <div class="stat">
          <span>Membres</span>
          <strong>{{ members().length }}</strong>
          <small>Actifs et invités</small>
        </div>
        <div class="stat">
          <span>Niveau moyen</span>
          <strong>{{ average() }}/100</strong>
          <small>Compétences suivies</small>
        </div>
        <div class="stat">
          <span>En formation</span>
          <strong>{{ inTraining() }}</strong>
          <small>La collecte reste active</small>
        </div>
        <div class="stat">
          <span>Certifications</span>
          <strong>{{ totalCertificates() }}</strong>
          <small>Adossées à une évaluation</small>
        </div>
      </div>

      <div class="split">
        <section class="panel">
          <h2>Membres de l’équipe</h2>
          <p class="panel__sub">Sélectionnez un membre pour voir le détail de ses compétences.</p>
          <div class="list">
            @for (member of members(); track member.id) {
              <button
                type="button"
                class="member"
                [class.member--active]="selected()?.id === member.id"
                (click)="selected.set(member)"
              >
                <span class="member__avatar">{{ initials(member.name) }}</span>
                <div class="member__body">
                  <div class="member__head">
                    <strong>{{ member.name }}</strong>
                    <span class="wa-chip" [class]="member.status === 'ACTIVE' ? 'wa-chip wa-chip--success' : 'wa-chip wa-chip--neutral'">
                      {{ member.status === 'ACTIVE' ? 'Actif' : member.status === 'INVITED' ? 'Invité' : 'Désactivé' }}
                    </span>
                  </div>
                  <p>{{ member.jobTitle }} · {{ member.department }}</p>
                  <div class="member__bar">
                    <div class="bar"><span [style.width.%]="member.averageLevel"></span></div>
                    <small>{{ member.averageLevel }}/100</small>
                  </div>
                  @if (member.activeFormation) {
                    <small class="wa-muted">{{ member.activeFormation }} · {{ member.formationProgress }} %</small>
                  }
                </div>
              </button>
            }
          </div>
        </section>

        <div style="display: flex; flex-direction: column; gap: 18px">
          @if (selected(); as member) {
            <section class="panel">
              <div class="detail-head">
                <span class="member__avatar member__avatar--lg">{{ initials(member.name) }}</span>
                <div>
                  <h2 style="margin: 0">{{ member.name }}</h2>
                  <p class="panel__sub" style="margin: 2px 0 0">
                    {{ member.jobTitle }} · {{ member.department }} · {{ member.email }}
                  </p>
                </div>
              </div>

              <div class="kv-grid" style="margin-top: 12px">
                <div class="kv">
                  <span>Compétences suivies</span>
                  <strong>{{ member.skillsTracked }}</strong>
                </div>
                <div class="kv">
                  <span>Certifications</span>
                  <strong>{{ member.certifications }}</strong>
                </div>
                <div class="kv">
                  <span>Dernière activité</span>
                  <strong>{{ member.lastActivityAt ? day(member.lastActivityAt) : '—' }}</strong>
                </div>
              </div>

              @if (member.lastEvaluation; as last) {
                <h3 class="sub">Dernière évaluation</h3>
                <div class="last-eval">
                  <div>
                    <strong>{{ last.score }}/100</strong>
                    <small>{{ methodLabels[last.method] }}</small>
                  </div>
                  <span class="wa-chip" [class]="last.decision === 'REUSSI' ? 'wa-chip wa-chip--success' : 'wa-chip wa-chip--danger'">
                    {{ last.decision === 'REUSSI' ? 'Réussi' : 'Non réussi' }}
                  </span>
                  <span class="wa-small wa-muted">{{ day(last.at) }}</span>
                </div>
              }

              @if (member.skills && member.skills.length > 0) {
                <h3 class="sub">Compétences</h3>
                <div class="skills">
                  @for (skill of member.skills; track skill.code) {
                    <div class="skill">
                      <div class="skill__head">
                        <strong>{{ skill.label }}</strong>
                        <span class="wa-small wa-muted">{{ sourceLabels[skill.source] }} · confiance {{ percent(skill.confidence) }}</span>
                      </div>
                      <wa-skill-bar [level]="skill.level" [target]="skill.target" />
                    </div>
                  }
                </div>
              } @else {
                <p class="empty" style="margin-top: 12px">
                  Aucune compétence détaillée disponible pour ce membre.
                </p>
              }

              @if (member.activeFormation) {
                <h3 class="sub">Formation en cours</h3>
                <div class="formation">
                  <strong>{{ member.activeFormation }}</strong>
                  <div class="bar" style="margin: 6px 0 4px"><span [style.width.%]="member.formationProgress"></span></div>
                  <small class="wa-muted">{{ member.formationProgress }} % · la collecte continue</small>
                </div>
              }
            </section>
          } @else {
            <section class="panel">
              <p class="empty">Sélectionnez un membre pour afficher ses compétences.</p>
            </section>
          }

          <section class="panel">
            <h2>Cadre d’usage</h2>
            <ul class="bullets">
              <li>Un niveau est une estimation sourcée, pas un jugement de valeur.</li>
              <li>Une déclaration n’est jamais présentée comme une preuve.</li>
              <li>Une formation terminée ne suffit pas : seule l’évaluation prouve la maîtrise.</li>
              <li>Les données nominatives ne sont pas transmises aux vues RH agrégées.</li>
            </ul>
            <a class="btn btn--small" routerLink="/app/confidentialite" style="margin-top: 10px">
              <span class="material-symbols-outlined">shield</span>
              Confidentialité
            </a>
          </section>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .member {
        display: flex;
        gap: 11px;
        align-items: flex-start;
        text-align: left;
        padding: 12px 13px;
        border-radius: 12px;
        border: 1px solid var(--wa-border);
        background: #fff;
        cursor: pointer;
      }
      .member--active {
        border-color: var(--wa-primary);
        background: #fbfcff;
        box-shadow: 0 0 0 3px rgba(47, 84, 235, 0.09);
      }
      .member__avatar {
        width: 34px;
        height: 34px;
        flex: none;
        border-radius: 10px;
        background: var(--wa-primary-soft);
        color: var(--wa-primary-deep);
        display: grid;
        place-items: center;
        font-size: 11px;
        font-weight: 700;
      }
      .member__avatar--lg {
        width: 46px;
        height: 46px;
        font-size: 13px;
      }
      .member__body {
        flex: 1;
        min-width: 0;
      }
      .member__head {
        display: flex;
        justify-content: space-between;
        gap: 8px;
        align-items: center;
      }
      .member__head strong {
        font-size: 12.5px;
      }
      .member__body p {
        margin: 2px 0 6px;
        font-size: 11px;
        color: var(--wa-ink-soft);
      }
      .member__bar {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .member__bar .bar {
        flex: 1;
      }
      .member__bar small {
        font-size: 10.5px;
        font-weight: 700;
        color: var(--wa-ink-soft);
      }
      .detail-head {
        display: flex;
        gap: 12px;
        align-items: center;
      }
      .last-eval {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 11px 13px;
        border-radius: 11px;
        background: var(--wa-surface-2);
      }
      .last-eval strong {
        display: block;
        font-size: 18px;
      }
      .last-eval small {
        font-size: 10.5px;
        color: var(--wa-ink-soft);
      }
      .skills {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .skill__head {
        display: flex;
        justify-content: space-between;
        gap: 8px;
        margin-bottom: 4px;
        font-size: 12px;
      }
      .formation {
        padding: 11px 13px;
        border-radius: 11px;
        border: 1px dashed var(--wa-border-strong);
      }
      .formation strong {
        font-size: 12.5px;
      }
      .bullets {
        margin: 0;
        padding-left: 18px;
        font-size: 12.5px;
        line-height: 1.65;
        color: var(--wa-ink-soft);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeamPage {
  private readonly data = inject(DataService);

  readonly members = computed(() => this.data.supervisorTeam());
  readonly methodLabels = EVALUATION_METHOD_LABELS;
  readonly sourceLabels = SKILL_SOURCE_LABELS;

  readonly selected = signal<TeamMember | undefined>(this.members()[0]);

  readonly average = computed(() => {
    const members = this.members();
    return members.length === 0
      ? 0
      : Math.round(members.reduce((sum, member) => sum + member.averageLevel, 0) / members.length);
  });

  readonly inTraining = computed(
    () => this.members().filter((member) => !!member.activeFormation).length,
  );

  readonly totalCertificates = computed(() =>
    this.members().reduce((sum, member) => sum + member.certifications, 0),
  );

  initials(name: string): string {
    return name
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('');
  }

  percent(value: number): string {
    return `${Math.round(value * 100)} %`;
  }

  day(value: string): string {
    return new Date(value).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }
}
