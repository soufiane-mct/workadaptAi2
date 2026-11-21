import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  DOMAIN_LABELS,
  Domain,
  FORMAT_LABELS,
  OnboardingProfile,
  PastTraining,
  SENIORITY_LABELS,
  Seniority,
  TRAINING_FORMATS,
  TrainingFormat,
} from '../../core/models';
import { DataService } from '../../core/data/data.service';
import { SkillBar } from '../../shared/ui/skill-bar';

@Component({
  selector: 'wa-profile-page',
  imports: [RouterLink, SkillBar],
  styleUrl: '../pages.scss',
  template: `
    <div class="page">
      <header class="page-head">
        <div>
          <h1>Mon profil professionnel</h1>
          <p>
            Le profil alimente la détection d’écarts et la génération des parcours. Il reste
            modifiable : une évolution de poste, un nouvel outil ou un objectif changeant doit
            être déclaré, sinon le diagnostic devient faux.
          </p>
        </div>
        <div class="page-head__actions">
          <a class="btn" routerLink="/app/onboarding">
            <span class="material-symbols-outlined">tune</span>
            Assistant de profil
          </a>
        </div>
      </header>

      @if (message()) {
        <p class="note" [class.note--ok]="saved()" [class.note--danger]="!saved()">{{ message() }}</p>
      }

      <div class="split">
        <div style="display: flex; flex-direction: column; gap: 18px">
          <section class="panel">
            <h2>Identité et poste</h2>
            <p class="panel__sub">Ces informations déterminent les compétences attendues.</p>
            <div class="form-grid form-grid--2">
              <label class="wa-field">
                <span class="wa-field__label">Prénom</span>
                <input class="wa-input" [value]="firstName()" (input)="firstName.set($any($event.target).value)" />
              </label>
              <label class="wa-field">
                <span class="wa-field__label">Nom</span>
                <input class="wa-input" [value]="lastName()" (input)="lastName.set($any($event.target).value)" />
              </label>
              <label class="wa-field">
                <span class="wa-field__label">E-mail professionnel</span>
                <input class="wa-input" type="email" [value]="email()" (input)="email.set($any($event.target).value)" />
              </label>
              <label class="wa-field">
                <span class="wa-field__label">Département</span>
                <input class="wa-input" [value]="department()" (input)="department.set($any($event.target).value)" />
              </label>
              <label class="wa-field">
                <span class="wa-field__label">Poste occupé</span>
                <input class="wa-input" [value]="jobTitle()" (input)="jobTitle.set($any($event.target).value)" />
              </label>
              <label class="wa-field">
                <span class="wa-field__label">Domaine</span>
                <select class="wa-select" [value]="domain()" (change)="domain.set($any($event.target).value)">
                  @for (item of domains; track item) {
                    <option [value]="item">{{ domainLabels[item] }}</option>
                  }
                </select>
              </label>
              <label class="wa-field">
                <span class="wa-field__label">Séniorité</span>
                <select class="wa-select" [value]="seniority()" (change)="seniority.set($any($event.target).value)">
                  @for (item of seniorities; track item) {
                    <option [value]="item">{{ seniorityLabels[item] }}</option>
                  }
                </select>
              </label>
              <label class="wa-field">
                <span class="wa-field__label">Disponibilité hebdomadaire (heures)</span>
                <input class="wa-input" type="number" min="1" max="20" [value]="weeklyHours()" (input)="weeklyHours.set(+$any($event.target).value)" />
              </label>
            </div>
          </section>

          <section class="panel">
            <h2>Outils et projets</h2>
            <p class="panel__sub">Un outil par ligne. Les outils déclarés orientent les mises en pratique.</p>
            <div class="form-grid">
              <label class="wa-field">
                <span class="wa-field__label">Outils utilisés</span>
                <textarea class="wa-textarea" rows="4" [value]="tools()" (input)="tools.set($any($event.target).value)"></textarea>
              </label>
              <label class="wa-field">
                <span class="wa-field__label">Projets récents</span>
                <textarea class="wa-textarea" rows="3" [value]="projects()" (input)="projects.set($any($event.target).value)"></textarea>
              </label>
              <label class="wa-field">
                <span class="wa-field__label">Objectifs professionnels</span>
                <textarea class="wa-textarea" rows="3" [value]="objectives()" (input)="objectives.set($any($event.target).value)"></textarea>
              </label>
            </div>
          </section>

          <section class="panel">
            <h2>Préférences de formation</h2>
            <p class="panel__sub">
              Ces préférences sont une indication, jamais une contrainte : le format dominant est
              choisi selon la nature de l’écart.
            </p>
            <div class="prefs">
              @for (format of formats; track format) {
                <button
                  type="button"
                  class="pref"
                  [class.pref--on]="preferences().includes(format)"
                  (click)="togglePreference(format)"
                >
                  <span class="material-symbols-outlined">{{ iconFor(format) }}</span>
                  {{ formatLabels[format] }}
                </button>
              }
            </div>
          </section>

          <section class="panel">
            <h2>Formations antérieures</h2>
            <p class="panel__sub">
              Une formation déclarée n’est pas une compétence prouvée : elle reste une donnée
              déclarée jusqu’à évaluation.
            </p>
            <div class="list">
              @for (training of pastTrainings(); track training.id) {
                <div class="row">
                  <span class="icon-round material-symbols-outlined">history_edu</span>
                  <div class="row__main">
                    <strong>{{ training.title }}</strong>
                    <p>{{ training.provider }} · {{ training.year }} · {{ training.completed ? 'Terminée' : 'Non terminée' }}</p>
                  </div>
                  @if (training.certificate) {
                    <span class="wa-chip wa-chip--neutral">{{ training.certificate }}</span>
                  }
                </div>
              }
              @if (pastTrainings().length === 0) {
                <p class="empty">Aucune formation antérieure déclarée.</p>
              }
            </div>
            <div class="form-grid form-grid--2" style="margin-top: 12px">
              <label class="wa-field">
                <span class="wa-field__label">Titre</span>
                <input class="wa-input" [value]="newTrainingTitle()" (input)="newTrainingTitle.set($any($event.target).value)" placeholder="Ex. Kubernetes pour développeurs" />
              </label>
              <label class="wa-field">
                <span class="wa-field__label">Organisme</span>
                <input class="wa-input" [value]="newTrainingProvider()" (input)="newTrainingProvider.set($any($event.target).value)" placeholder="Ex. Interne" />
              </label>
            </div>
            <button class="btn btn--small" type="button" style="margin-top: 8px" [disabled]="!newTrainingTitle().trim()" (click)="addTraining()">
              <span class="material-symbols-outlined">add</span>
              Ajouter une formation déclarée
            </button>
          </section>

          <section class="panel">
            <h2>Consentements</h2>
            <div class="checks">
              <label class="check">
                <input type="checkbox" [checked]="consentCollect()" (change)="consentCollect.set($any($event.target).checked)" />
                <span>
                  <strong>Collecte permanente</strong><br />
                  <span class="wa-small wa-muted">
                    Nécessaire au diagnostic. Sans ce consentement, aucun écart ne peut être
                    détecté ni mis à jour, et le parcours en cours est suspendu.
                  </span>
                </span>
              </label>
              <label class="check">
                <input type="checkbox" [checked]="consentShare()" (change)="consentShare.set($any($event.target).checked)" />
                <span>
                  <strong>Partage avec le superviseur</strong><br />
                  <span class="wa-small wa-muted">
                    Permet à votre superviseur de suivre votre progression et vos résultats.
                    Sans ce consentement, il ne voit plus votre parcours ni vos résultats — la
                    validation de la demande reste possible. Les données RH restent agrégées
                    et non nominatives.
                  </span>
                </span>
              </label>
            </div>
          </section>

          <div class="toolbar">
            <button class="btn btn--primary" type="button" (click)="save()">
              <span class="material-symbols-outlined">save</span>
              Enregistrer le profil
            </button>
            <button class="btn" type="button" (click)="reset()">
              <span class="material-symbols-outlined">undo</span>
              Rétablir
            </button>
            <span class="wa-small wa-muted">Dernière mise à jour : {{ when(profile().updatedAt) }}</span>
          </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 18px">
          <section class="panel">
            <h2>CV analysé</h2>
            @if (cv(); as file) {
              <div class="cv">
                <span class="material-symbols-outlined">description</span>
                <div>
                  <strong>{{ file.fileName }}</strong>
                  <small>Importé le {{ when(file.uploadedAt) }} · extraction simulée</small>
                </div>
              </div>
              <h3 class="sub">Compétences extraites</h3>
              <div class="chips">
                @for (skill of file.skills; track skill) {
                  <span class="wa-chip wa-chip--neutral">{{ skill }}</span>
                }
              </div>
              <h3 class="sub">Expériences</h3>
              <ul class="bullets">
                @for (item of file.experiences; track item) {
                  <li>{{ item }}</li>
                }
              </ul>
              <h3 class="sub">Certifications</h3>
              <ul class="bullets">
                @for (item of file.certifications; track item) {
                  <li>{{ item }}</li>
                }
              </ul>
            } @else {
              <p class="empty">Aucun CV importé.</p>
            }
          </section>

          <section class="panel">
            <h2>Compétences suivies</h2>
            <p class="panel__sub">{{ skills().length }} compétences · niveau moyen {{ averageLevel() }}/100</p>
            <div class="skills">
              @for (skill of skills(); track skill.code) {
                <div class="skill">
                  <div class="skill__head">
                    <strong>{{ skill.label }}</strong>
                    <span class="wa-small wa-muted">{{ skill.level }} / {{ skill.target }}</span>
                  </div>
                  <wa-skill-bar [level]="skill.level" [target]="skill.target" />
                </div>
              }
            </div>
            <a class="btn btn--small" routerLink="/app/ecarts" style="margin-top: 12px">
              Voir les écarts associés
            </a>
          </section>

          <section class="panel">
            <h2>Données de démonstration</h2>
            <p class="panel__sub">
              Efface uniquement votre espace de démonstration : profil, écarts, formations,
              évaluations, certificats et notifications personnelles. Votre compte reste
              connecté ; les espaces des autres collaborateurs ne sont pas touchés.
            </p>
            <button class="btn btn--danger" type="button" (click)="eraseWorkspace()">
              <span class="material-symbols-outlined">delete_forever</span>
              Effacer mon espace
            </button>
          </section>

          <section class="panel">
            <h2>Transmission à l’IA</h2>
            <p class="panel__sub" style="margin-bottom: 10px">
              Le profil est envoyé au Agent d’analyse des compétences à chaque enregistrement. La
              réponse dépend du consentement.
            </p>
            <button class="btn" type="button" (click)="sendToAi()">
              <span class="material-symbols-outlined">send</span>
              Envoyer le profil à l’IA
            </button>
          </section>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .prefs {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 8px;
      }
      .pref {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 9px 11px;
        border-radius: 10px;
        border: 1px solid var(--wa-border);
        background: #fff;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
      }
      .pref--on {
        border-color: var(--wa-primary);
        background: var(--wa-primary-soft);
        color: var(--wa-primary-deep);
      }
      .pref .material-symbols-outlined {
        font-size: 17px;
      }
      .cv {
        display: flex;
        gap: 10px;
        align-items: center;
        padding: 11px 13px;
        border-radius: 11px;
        background: var(--wa-surface-2);
      }
      .cv .material-symbols-outlined {
        font-size: 26px;
        color: var(--wa-primary);
      }
      .cv small {
        display: block;
        font-size: 10.5px;
        color: var(--wa-ink-soft);
      }
      .bullets {
        margin: 0;
        padding-left: 18px;
        font-size: 12px;
        line-height: 1.6;
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
      .checks {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfilePage {
  private readonly data = inject(DataService);

  readonly profile = this.data.profile;
  readonly skills = this.data.skills;
  readonly averageLevel = this.data.averageLevel;

  readonly domainLabels = DOMAIN_LABELS;
  readonly seniorityLabels = SENIORITY_LABELS;
  readonly formatLabels = FORMAT_LABELS;
  readonly formats = TRAINING_FORMATS;
  readonly domains = Object.keys(DOMAIN_LABELS) as Domain[];
  readonly seniorities = Object.keys(SENIORITY_LABELS) as Seniority[];

  readonly firstName = signal(this.profile().firstName);
  readonly lastName = signal(this.profile().lastName);
  readonly email = signal(this.profile().email);
  readonly department = signal(this.profile().department);
  readonly jobTitle = signal(this.profile().jobTitle);
  readonly domain = signal<Domain>(this.profile().domain);
  readonly seniority = signal<Seniority>(this.profile().seniority);
  readonly weeklyHours = signal(this.profile().weeklyHours);
  readonly tools = signal(this.profile().tools.join('\n'));
  readonly projects = signal(this.profile().projects.join('\n'));
  readonly objectives = signal(this.profile().objectives.join('\n'));
  readonly preferences = signal<TrainingFormat[]>([...this.profile().preferences]);
  readonly consentCollect = signal(this.profile().consent.collect);
  readonly consentShare = signal(this.profile().consent.shareWithSupervisor);
  readonly pastTrainings = signal<PastTraining[]>([...this.profile().pastTrainings]);
  readonly cv = computed(() => this.profile().cv);

  readonly newTrainingTitle = signal('');
  readonly newTrainingProvider = signal('');

  readonly message = signal('');
  readonly saved = signal(true);

  toList(value: string): string[] {
    return value
      .split('\n')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }

  togglePreference(format: TrainingFormat): void {
    this.preferences.update((list) =>
      list.includes(format) ? list.filter((item) => item !== format) : [...list, format],
    );
  }

  addTraining(): void {
    const title = this.newTrainingTitle().trim();
    if (!title) {
      return;
    }
    this.pastTrainings.update((list) => [
      ...list,
      {
        id: `pt-${Date.now()}`,
        title,
        provider: this.newTrainingProvider().trim() || 'Non précisé',
        year: new Date().getFullYear(),
        completed: true,
      },
    ]);
    this.newTrainingTitle.set('');
    this.newTrainingProvider.set('');
  }

  save(): void {
    if (!this.firstName().trim() || !this.lastName().trim() || !this.email().trim()) {
      this.saved.set(false);
      this.message.set('Prénom, nom et e-mail sont obligatoires.');
      return;
    }
    if (!this.consentCollect()) {
      this.saved.set(false);
      this.message.set(
        'Le consentement de collecte est requis : sans lui, le diagnostic ne peut pas fonctionner.',
      );
      return;
    }
    const current = this.profile();
    const profile: OnboardingProfile = {
      ...current,
      firstName: this.firstName().trim(),
      lastName: this.lastName().trim(),
      email: this.email().trim(),
      department: this.department().trim(),
      jobTitle: this.jobTitle().trim(),
      domain: this.domain(),
      seniority: this.seniority(),
      weeklyHours: Math.min(20, Math.max(1, this.weeklyHours() || 1)),
      tools: this.toList(this.tools()),
      projects: this.toList(this.projects()),
      objectives: this.toList(this.objectives()),
      preferences: this.preferences(),
      pastTrainings: this.pastTrainings(),
      consent: {
        ...current.consent,
        collect: this.consentCollect(),
        shareWithSupervisor: this.consentShare(),
        at: current.consent.at,
      },
    };
    this.data.saveProfile(profile);
    const send = this.data.profileService.submitToAi();
    this.saved.set(send.accepted);
    this.message.set(
      send.accepted
        ? 'Profil enregistré et transmis au Agent d’analyse des compétences. Le diagnostic sera recalculé.'
        : send.summary,
    );
  }

  reset(): void {
    const profile = this.profile();
    this.firstName.set(profile.firstName);
    this.lastName.set(profile.lastName);
    this.email.set(profile.email);
    this.department.set(profile.department);
    this.jobTitle.set(profile.jobTitle);
    this.domain.set(profile.domain);
    this.seniority.set(profile.seniority);
    this.weeklyHours.set(profile.weeklyHours);
    this.tools.set(profile.tools.join('\n'));
    this.projects.set(profile.projects.join('\n'));
    this.objectives.set(profile.objectives.join('\n'));
    this.preferences.set([...profile.preferences]);
    this.consentCollect.set(profile.consent.collect);
    this.consentShare.set(profile.consent.shareWithSupervisor);
    this.pastTrainings.set([...profile.pastTrainings]);
    this.message.set('Modifications non enregistrées annulées.');
    this.saved.set(true);
  }

  /**
   * Efface l'espace personnel après une confirmation explicite.
   *
   * Le compte et la session sont conservés ; le collaborateur peut ensuite
   * reconstruire un espace vierge à partir de son profil.
   */
  eraseWorkspace(): void {
    const confirmed = window.confirm(
      'Effacer toutes les données de votre espace de démonstration ? Cette action est irréversible et votre compte restera connecté.',
    );
    if (!confirmed) {
      this.message.set('L’effacement a été annulé : votre espace est inchangé.');
      this.saved.set(true);
      return;
    }

    this.data.resetEmployeeWorkspace();
    this.reset();
    this.message.set(
      'Votre espace de démonstration a été effacé. Votre compte est conservé et reste connecté.',
    );
    this.saved.set(true);
  }

  sendToAi(): void {
    const result = this.data.profileService.submitToAi();
    this.saved.set(result.accepted);
    this.message.set(result.summary);
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

  when(value: string): string {
    return new Date(value).toLocaleString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
