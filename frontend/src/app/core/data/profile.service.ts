import { computed, inject, Injectable, signal } from '@angular/core';
import {
  CvExtraction,
  EvidenceRef,
  OnboardingProfile,
  PastTraining,
  SkillEstimate,
  SkillHistoryEntry,
} from '../models';
import { AuthService } from '../auth/auth.service';
import { INITIAL_PROFILE, INITIAL_SKILL_HISTORY, INITIAL_SKILLS } from './mock-data';
import { DemoStateStore } from './demo-state.store';

type ProfileMap = Record<string, OnboardingProfile>;
type SkillMap = Record<string, SkillEstimate[]>;
type HistoryMap = Record<string, SkillHistoryEntry[]>;

const INITIAL_PROFILES: ProfileMap = { 'emp-0001': INITIAL_PROFILE };
const INITIAL_SKILLS_BY_EMPLOYEE: SkillMap = { 'emp-0001': INITIAL_SKILLS };
const INITIAL_HISTORY_BY_EMPLOYEE: HistoryMap = { 'emp-0001': INITIAL_SKILL_HISTORY };

function cloneProfile(profile: OnboardingProfile): OnboardingProfile {
  return {
    ...profile,
    tools: [...profile.tools],
    projects: [...profile.projects],
    objectives: [...profile.objectives],
    preferences: [...profile.preferences],
    consent: { ...profile.consent },
    cv: profile.cv
      ? {
          ...profile.cv,
          experiences: [...profile.cv.experiences],
          skills: [...profile.cv.skills],
          tools: [...profile.cv.tools],
          certifications: [...profile.cv.certifications],
          projects: [...profile.cv.projects],
        }
      : undefined,
    pastTrainings: profile.pastTrainings.map((training) => ({ ...training })),
  };
}

/**
 * Profil professionnel, compétences et historique.
 *
 * Chaque employé possède un espace strictement isolé. Les ressources du
 * collaborateur connecté ne sont jamais fusionnées avec celles d'un autre
 * compte, y compris lorsque plusieurs profils sont créés sur le même
 * navigateur. L'état de démonstration est persisté par version.
 */
@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly auth = inject(AuthService);
  private readonly store = inject(DemoStateStore);

  private readonly _profiles = signal<ProfileMap>(
    this.store.read<ProfileMap>('profile.profiles', INITIAL_PROFILES),
  );
  private readonly _skillsByEmployee = signal<SkillMap>(
    this.store.read<SkillMap>('profile.skills', INITIAL_SKILLS_BY_EMPLOYEE),
  );
  private readonly _historyByEmployee = signal<HistoryMap>(
    this.store.read<HistoryMap>('profile.history', INITIAL_HISTORY_BY_EMPLOYEE),
  );

  readonly profiles = this._profiles.asReadonly();
  readonly profile = computed(() => this.profileFor(this.employeeId()));
  readonly skills = computed(() => this.skillsFor(this.employeeId()));
  readonly history = computed(() => this.historyForEmployee(this.employeeId()));

  readonly fullName = computed(() => {
    const profile = this.profile();
    return `${profile.firstName} ${profile.lastName}`.trim();
  });

  /** Identifiant métier du collaborateur connecté. */
  readonly employeeId = computed(() => {
    const user = this.auth.user();
    if (!user) {
      // Les tests de domaine et le premier rendu hors session utilisent le
      // profil de démonstration. Aucun écran personnel n'est accessible sans
      // rôle EMPLOYEE.
      return 'emp-0001';
    }
    return user.role === 'EMPLOYEE' ? (user.employeeId ?? '') : '';
  });

  readonly profileComplete = computed(() => {
    const profile = this.profile();
    return !!profile.domain && profile.tools.length > 0 && profile.consent.collect;
  });

  readonly averageLevel = computed(() => {
    const skills = this.skills();
    return skills.length === 0
      ? 0
      : Math.round(skills.reduce((sum, skill) => sum + skill.level, 0) / skills.length);
  });

  readonly atRiskSkills = computed(() =>
    this.skills().filter((skill) => skill.target - skill.level >= 20),
  );

  readonly totalGapPoints = computed(() =>
    this.skills().reduce((sum, skill) => sum + Math.max(0, skill.target - skill.level), 0),
  );

  constructor() {
    // Ne conserve que des données dont le propriétaire est explicite.
    this.sanitizeStoredWorkspaces();
  }

  /** Profil d'un employé donné, sans exposer les autres profils. */
  profileFor(employeeId: string): OnboardingProfile {
    const stored = this._profiles()[employeeId];
    if (stored) {
      return stored;
    }
    return this.blankProfile(employeeId);
  }

  skillsFor(employeeId: string): SkillEstimate[] {
    return this._skillsByEmployee()[employeeId] ?? [];
  }

  historyForEmployee(employeeId: string): SkillHistoryEntry[] {
    return this._historyByEmployee()[employeeId] ?? [];
  }

  /** Vérifie le partage au superviseur pour un employé précis. */
  consentFor(employeeId: string): boolean {
    return this._profiles()[employeeId]?.consent.shareWithSupervisor ?? false;
  }

  /** Enregistre le profil d'onboarding (création ou mise à jour). */
  saveProfile(profile: OnboardingProfile): void {
    const activeEmployeeId = this.employeeId();
    const employeeId = activeEmployeeId || profile.employeeId;
    if (!employeeId || profile.employeeId !== employeeId) {
      return;
    }

    const owned: OnboardingProfile = {
      ...cloneProfile(profile),
      employeeId,
      updatedAt: new Date().toISOString(),
    };
    this._profiles.update((profiles) => ({ ...profiles, [employeeId]: owned }));
    this.ensureInitialSkills(owned);
    this.persistProfiles();
    this.persistSkills();
  }

  updateProfile(patch: Partial<OnboardingProfile>): void {
    const employeeId = this.employeeId();
    if (!employeeId) {
      return;
    }
    const current = this.profileFor(employeeId);
    const updated: OnboardingProfile = {
      ...current,
      ...patch,
      employeeId,
      consent: patch.consent ?? current.consent,
      updatedAt: new Date().toISOString(),
    };
    this._profiles.update((profiles) => ({ ...profiles, [employeeId]: updated }));
    this.persistProfiles();
  }

  /** Import CV simulé : l'extraction est présentée puis validable par l'employé. */
  attachCv(cv: CvExtraction): void {
    const employeeId = this.employeeId();
    if (!employeeId) {
      return;
    }
    this._profiles.update((profiles) => ({
      ...profiles,
      [employeeId]: {
        ...this.profileFor(employeeId),
        cv,
        updatedAt: new Date().toISOString(),
      },
    }));
    this.persistProfiles();
  }

  setPastTrainings(trainings: PastTraining[]): void {
    const employeeId = this.employeeId();
    if (!employeeId) {
      return;
    }
    this._profiles.update((profiles) => ({
      ...profiles,
      [employeeId]: {
        ...this.profileFor(employeeId),
        pastTrainings: trainings.map((training) => ({ ...training })),
        updatedAt: new Date().toISOString(),
      },
    }));
    this.persistProfiles();
  }

  skill(code: string): SkillEstimate | undefined {
    return this.skills().find((skill) => skill.code === code);
  }

  /** Met à jour un niveau avec traçabilité complète (cause + preuves). */
  updateSkillLevel(input: {
    code: string;
    level: number;
    cause: SkillHistoryEntry['cause'];
    evidenceIds: string[];
    confidence: number;
    source?: SkillEstimate['source'];
  }): void {
    const existing = this.skill(input.code);
    if (!existing) {
      return;
    }
    const previousLevel = existing.level;
    const newLevel = Math.max(0, Math.min(100, Math.round(input.level)));
    if (newLevel === previousLevel) {
      return;
    }

    this._skillsByEmployee.update((map) => ({
      ...map,
      [existing.employeeId]: (map[existing.employeeId] ?? []).map((skill) =>
        skill.code === input.code
          ? {
              ...skill,
              level: newLevel,
              trend: skill.trend + (newLevel - previousLevel),
              source: input.source ?? skill.source,
              confidence: input.confidence,
              lastAssessed: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }
          : skill,
      ),
    }));

    this._historyByEmployee.update((map) => ({
      ...map,
      [existing.employeeId]: [
        {
          employeeId: existing.employeeId,
          id: `hist-${Date.now()}-${input.code}`,
          at: new Date().toISOString(),
          skillCode: input.code,
          skill: existing.label,
          previousLevel,
          newLevel,
          cause: input.cause,
          evidenceIds: input.evidenceIds,
          confidence: input.confidence,
        },
        ...(map[existing.employeeId] ?? []),
      ],
    }));
    this.persistSkills();
    this.persistHistory();
  }

  addEvidence(code: string, evidence: EvidenceRef): void {
    const employeeId = this.employeeId();
    if (!employeeId) {
      return;
    }
    this._skillsByEmployee.update((map) => ({
      ...map,
      [employeeId]: (map[employeeId] ?? []).map((skill) =>
        skill.code === code
          ? { ...skill, evidence: [evidence, ...skill.evidence], updatedAt: new Date().toISOString() }
          : skill,
      ),
    }));
    this.persistSkills();
  }

  /** Ajoute une compétence nouvellement identifiée par l'analyse. */
  addSkill(skill: SkillEstimate): void {
    const employeeId = this.employeeId();
    if (!employeeId || skill.employeeId !== employeeId || this.skill(skill.code)) {
      return;
    }
    this._skillsByEmployee.update((map) => ({
      ...map,
      [employeeId]: [...(map[employeeId] ?? []), skill],
    }));
    this.persistSkills();
  }

  historyFor(code: string): SkillHistoryEntry[] {
    return this.history().filter((entry) => entry.skillCode === code);
  }

  /** Simule l'envoi du profil à l'IA (Learning Planner / Skill Intelligence). */
  submitToAi(): { accepted: boolean; summary: string } {
    const profile = this.profile();
    if (!profile.consent.collect) {
      return {
        accepted: false,
        summary: 'Le consentement de collecte est requis avant tout envoi à l’IA.',
      };
    }
    return {
      accepted: true,
      summary: `Profil ${profile.domain} · ${profile.tools.length} outils · ${profile.objectives.length} objectifs transmis au Agent d’analyse des compétences.`,
    };
  }

  /** Efface l'espace d'un collaborateur sans toucher aux autres employés. */
  clearEmployee(employeeId: string): void {
    this._profiles.update((profiles) => {
      const next = { ...profiles };
      delete next[employeeId];
      return next;
    });
    this._skillsByEmployee.update((map) => {
      const next = { ...map };
      delete next[employeeId];
      return next;
    });
    this._historyByEmployee.update((map) => {
      const next = { ...map };
      delete next[employeeId];
      return next;
    });
    this.persistProfiles();
    this.persistSkills();
    this.persistHistory();
  }

  /** Rétablit les jeux de données de démonstration. */
  reset(): void {
    this._profiles.set({ 'emp-0001': cloneProfile(INITIAL_PROFILE) });
    this._skillsByEmployee.set({ 'emp-0001': INITIAL_SKILLS.map((skill) => ({ ...skill })) });
    this._historyByEmployee.set({ 'emp-0001': INITIAL_SKILL_HISTORY.map((entry) => ({ ...entry })) });
    this.persistProfiles();
    this.persistSkills();
    this.persistHistory();
  }

  private blankProfile(employeeId: string): OnboardingProfile {
    const user = this.auth.user();
    const names = user?.name.trim().split(/\s+/) ?? [];
    const firstName = names[0] ?? '';
    const lastName = names.slice(1).join(' ');
    const now = new Date().toISOString();
    return {
      id: employeeId ? `prof-${employeeId}` : 'prof-anonyme',
      userId: user?.id ?? '',
      employeeId,
      firstName,
      lastName,
      email: user?.email ?? '',
      department: user?.department ?? '',
      jobTitle: user?.jobTitle ?? '',
      domain: 'OTHER',
      seniority: 'CONFIRMED',
      tools: [],
      projects: [],
      objectives: [],
      weeklyHours: 6,
      preferences: [],
      consent: { collect: false, shareWithSupervisor: false, at: now },
      pastTrainings: [],
      updatedAt: now,
    };
  }

  /**
   * Crée les premières estimations déclaratives d'un nouvel espace. Elles
   * sont dérivées des outils saisis par son propriétaire et ne réutilisent
   * jamais le profil d'un autre collaborateur.
   */
  private ensureInitialSkills(profile: OnboardingProfile): void {
    const existing = this._skillsByEmployee()[profile.employeeId] ?? [];
    if (existing.length > 0) {
      return;
    }

    const candidates = [...(profile.cv?.skills ?? []), ...profile.tools];
    const unique = Array.from(
      new Map(
        candidates
          .filter((label) => label.trim().length > 0)
          .map((label) => [this.skillCode(label), label.trim()] as const),
      ).values(),
    ).slice(0, 5);

    const now = new Date().toISOString();
    const skills: SkillEstimate[] = unique.map((label, index) => {
      const code = this.skillCode(label);
      const evidence: EvidenceRef = {
        id: `ev-${profile.employeeId}-${code}`,
        at: now,
        source: 'INTERVIEW',
        statement: `${label} déclaré comme outil ou compétence lors du diagnostic.`,
        observed: false,
        confidence: 0.45,
      };
      return {
        employeeId: profile.employeeId,
        code,
        label,
        category: 'Compétence déclarée',
        level: 35,
        target: 70,
        confidence: 0.45,
        trend: 0,
        source: 'DECLARED',
        evidence: [evidence],
        lastAssessed: now,
        updatedAt: now,
      };
    });

    this._skillsByEmployee.update((map) => ({
      ...map,
      [profile.employeeId]: skills,
    }));
  }

  private skillCode(label: string): string {
    return label
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  private sanitizeStoredWorkspaces(): void {
    const profiles = this._profiles();
    const safeProfiles: ProfileMap = {};
    for (const [employeeId, profile] of Object.entries(profiles)) {
      if (employeeId && profile.employeeId === employeeId) {
        safeProfiles[employeeId] = profile;
      }
    }

    const skills: SkillMap = {};
    for (const [employeeId, items] of Object.entries(this._skillsByEmployee())) {
      skills[employeeId] = items.filter((skill) => skill.employeeId === employeeId);
    }

    const history: HistoryMap = {};
    for (const [employeeId, items] of Object.entries(this._historyByEmployee())) {
      history[employeeId] = items.filter((entry) => entry.employeeId === employeeId);
    }

    this._profiles.set(safeProfiles);
    this._skillsByEmployee.set(skills);
    this._historyByEmployee.set(history);
  }

  private persistProfiles(): void {
    this.store.write('profile.profiles', this._profiles());
  }

  private persistSkills(): void {
    this.store.write('profile.skills', this._skillsByEmployee());
  }

  private persistHistory(): void {
    this.store.write('profile.history', this._historyByEmployee());
  }
}
