import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  CvExtraction,
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
import { AuthService } from '../../core/auth/auth.service';
import { DataService } from '../../core/data/data.service';
import { DOMAIN_OPTIONS } from '../../core/data/mock-data';

@Component({
  selector: 'wa-onboarding',
  imports: [RouterLink],
  templateUrl: './onboarding.html',
  styleUrl: './onboarding.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Onboarding {
  private readonly auth = inject(AuthService);
  private readonly data = inject(DataService);
  private readonly router = inject(Router);

  readonly mode = input<'register' | 'profile'>('profile');
  readonly isRegister = computed(() => this.mode() === 'register');

  readonly domainOptions = DOMAIN_OPTIONS;
  readonly domainLabels = DOMAIN_LABELS;
  readonly seniorityLabels = SENIORITY_LABELS;
  readonly formats = TRAINING_FORMATS;
  readonly formatLabels = FORMAT_LABELS;
  readonly domains = Object.keys(DOMAIN_LABELS) as Domain[];
  readonly seniorities = Object.keys(SENIORITY_LABELS) as Seniority[];

  readonly firstName = signal('');
  readonly lastName = signal('');
  readonly email = signal('');
  readonly department = signal('');
  readonly jobTitle = signal('');
  readonly domain = signal<Domain>('DEV');
  readonly seniority = signal<Seniority>('CONFIRMED');
  readonly tools = signal('');
  readonly projects = signal('');
  readonly objectives = signal('');
  readonly weeklyHours = signal(6);
  readonly preferences = signal<TrainingFormat[]>(['PRACTICAL', 'MULTIMEDIA']);
  readonly consentCollect = signal(true);
  readonly consentShare = signal(true);
  readonly pastTrainings = signal<PastTraining[]>([]);
  readonly cv = signal<CvExtraction | undefined>(undefined);
  readonly message = signal('');
  readonly submitted = signal(false);
  readonly error = signal('');

  constructor() {
    const profile = this.data.profile();
    this.firstName.set(profile.firstName);
    this.lastName.set(profile.lastName);
    this.email.set(profile.email);
    this.department.set(profile.department);
    this.jobTitle.set(profile.jobTitle);
    this.domain.set(profile.domain);
    this.seniority.set(profile.seniority);
    this.tools.set(profile.tools.join(', '));
    this.projects.set(profile.projects.join(', '));
    this.objectives.set(profile.objectives.join('\n'));
    this.weeklyHours.set(profile.weeklyHours);
    this.preferences.set([...profile.preferences]);
    this.consentCollect.set(profile.consent.collect);
    this.consentShare.set(profile.consent.shareWithSupervisor);
    this.pastTrainings.set([...profile.pastTrainings]);
    this.cv.set(profile.cv);
  }

  toggleFormat(format: TrainingFormat): void {
    this.preferences.update((current) =>
      current.includes(format) ? current.filter((item) => item !== format) : [...current, format],
    );
  }

  isPreferred(format: TrainingFormat): boolean {
    return this.preferences().includes(format);
  }

  onFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    const technologies = file.name.toLowerCase().includes('docker')
      ? ['Docker', 'CI/CD', 'Git']
      : ['Docker', 'Git', 'Angular'];
    this.cv.set({
      fileName: file.name,
      uploadedAt: new Date().toISOString(),
      experiences: ['Expérience extraite automatiquement — à confirmer'],
      skills: technologies,
      tools: technologies,
      certifications: [],
      projects: [],
    });
    this.message.set(
      `CV « ${file.name} » analysé : ${technologies.length} compétences détectées. Vérifiez et corrigez avant envoi.`,
    );
  }

  addPastTraining(): void {
    this.pastTrainings.update((items) => [
      ...items,
      {
        id: `pt-${Date.now()}`,
        title: '',
        provider: '',
        year: new Date().getFullYear() - 1,
        completed: true,
      },
    ]);
  }

  updatePastTraining(id: string, patch: Partial<PastTraining>): void {
    this.pastTrainings.update((items) =>
      items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  }

  removePastTraining(id: string): void {
    this.pastTrainings.update((items) => items.filter((item) => item.id !== id));
  }

  submit(event: Event): void {
    event.preventDefault();
    this.error.set('');
    if (!this.firstName().trim() || !this.lastName().trim() || !this.email().trim()) {
      this.error.set('Nom, prénom et adresse professionnelle sont obligatoires.');
      return;
    }
    if (!this.jobTitle().trim()) {
      this.error.set('Le poste occupé est obligatoire pour estimer les compétences attendues.');
      return;
    }
    if (!this.consentCollect()) {
      this.error.set(
        'Le consentement de collecte est requis : sans lui, aucun diagnostic ne peut être produit.',
      );
      return;
    }

    let userId = this.data.profile().userId;
    if (this.isRegister()) {
      const account = this.auth.register({
        firstName: this.firstName(),
        lastName: this.lastName(),
        email: this.email(),
        jobTitle: this.jobTitle(),
        department: this.department() || 'Non renseigné',
      });
      userId = account.id;
    }

    const profile: OnboardingProfile = {
      ...this.data.profile(),
      userId,
      firstName: this.firstName().trim(),
      lastName: this.lastName().trim(),
      email: this.email().trim(),
      department: this.department().trim() || 'Non renseigné',
      jobTitle: this.jobTitle().trim(),
      domain: this.domain(),
      seniority: this.seniority(),
      tools: this.splitList(this.tools()),
      projects: this.splitList(this.projects()),
      objectives: this.objectives()
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0),
      weeklyHours: this.weeklyHours(),
      preferences: this.preferences().length > 0 ? this.preferences() : ['PRACTICAL'],
      consent: {
        collect: this.consentCollect(),
        shareWithSupervisor: this.consentShare(),
        at: new Date().toISOString(),
      },
      cv: this.cv(),
      pastTrainings: this.pastTrainings().filter((training) => training.title.trim().length > 0),
      updatedAt: new Date().toISOString(),
    };

    this.data.saveProfile(profile);
    const send = this.data.profileService.submitToAi();
    this.message.set(send.summary);
    this.data.collectionService.runInitialCollection(profile);
    this.submitted.set(true);

    if (this.isRegister()) {
      void this.router.navigate(['/app/tableau-de-bord']);
      return;
    }
    this.message.set(
      `Profil enregistré et transmis. ${send.summary} La collecte continue et recalculera vos écarts.`,
    );
  }

  private splitList(value: string): string[] {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }
}
