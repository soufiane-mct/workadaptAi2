import { computed, Injectable, signal } from '@angular/core';
import {
  CvExtraction,
  EvidenceRef,
  OnboardingProfile,
  PastTraining,
  SkillEstimate,
  SkillHistoryEntry,
} from '../models';
import { INITIAL_PROFILE, INITIAL_SKILL_HISTORY, INITIAL_SKILLS } from './mock-data';

/**
 * Profil professionnel, compétences et historique.
 *
 * L’onboarding est fait une seule fois, puis reste modifiable.
 * Les niveaux de compétence sont mis à jour par la collecte, les formations
 * terminées et les évaluations.
 */
@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly _profile = signal<OnboardingProfile>({ ...INITIAL_PROFILE });
  private readonly _skills = signal<SkillEstimate[]>(INITIAL_SKILLS);
  private readonly _history = signal<SkillHistoryEntry[]>(INITIAL_SKILL_HISTORY);

  readonly profile = this._profile.asReadonly();
  readonly skills = this._skills.asReadonly();
  readonly history = this._history.asReadonly();

  readonly fullName = computed(() => {
    const profile = this._profile();
    return `${profile.firstName} ${profile.lastName}`.trim();
  });

  readonly profileComplete = computed(() => {
    const profile = this._profile();
    return !!profile.domain && profile.tools.length > 0 && profile.consent.collect;
  });

  readonly averageLevel = computed(() => {
    const skills = this._skills();
    return skills.length === 0
      ? 0
      : Math.round(skills.reduce((sum, skill) => sum + skill.level, 0) / skills.length);
  });

  readonly atRiskSkills = computed(() =>
    this._skills().filter((skill) => skill.target - skill.level >= 20),
  );

  readonly totalGapPoints = computed(() =>
    this._skills().reduce((sum, skill) => sum + Math.max(0, skill.target - skill.level), 0),
  );

  /** Enregistre le profil d’onboarding (création ou mise à jour). */
  saveProfile(profile: OnboardingProfile): void {
    this._profile.set({ ...profile, updatedAt: new Date().toISOString() });
  }

  updateProfile(patch: Partial<OnboardingProfile>): void {
    this._profile.update((profile) => ({
      ...profile,
      ...patch,
      consent: patch.consent ?? profile.consent,
      updatedAt: new Date().toISOString(),
    }));
  }

  /** Import CV simulé : l’extraction est présentée puis validable par l’employé. */
  attachCv(cv: CvExtraction): void {
    this._profile.update((profile) => ({ ...profile, cv, updatedAt: new Date().toISOString() }));
  }

  setPastTrainings(trainings: PastTraining[]): void {
    this._profile.update((profile) => ({
      ...profile,
      pastTrainings: trainings,
      updatedAt: new Date().toISOString(),
    }));
  }

  skill(code: string): SkillEstimate | undefined {
    return this._skills().find((skill) => skill.code === code);
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

    this._skills.update((skills) =>
      skills.map((skill) =>
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
    );

    this._history.update((history) => [
      {
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
      ...history,
    ]);
  }

  addEvidence(code: string, evidence: EvidenceRef): void {
    this._skills.update((skills) =>
      skills.map((skill) =>
        skill.code === code
          ? { ...skill, evidence: [evidence, ...skill.evidence], updatedAt: new Date().toISOString() }
          : skill,
      ),
    );
  }

  /** Ajoute une compétence nouvellement identifiée par l’analyse. */
  addSkill(skill: SkillEstimate): void {
    if (this.skill(skill.code)) {
      return;
    }
    this._skills.update((skills) => [...skills, skill]);
  }

  historyFor(code: string): SkillHistoryEntry[] {
    return this._history().filter((entry) => entry.skillCode === code);
  }

  /** Simule l’envoi du profil à l’IA (Learning Planner / Skill Intelligence). */
  submitToAi(): { accepted: boolean; summary: string } {
    const profile = this._profile();
    if (!profile.consent.collect) {
      return {
        accepted: false,
        summary: 'Le consentement de collecte est requis avant tout envoi à l’IA.',
      };
    }
    return {
      accepted: true,
      summary: `Profil ${profile.domain} · ${profile.tools.length} outils · ${profile.objectives.length} objectifs transmis au Skill Intelligence Agent.`,
    };
  }
}
