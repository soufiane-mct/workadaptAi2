import { computed, inject, Injectable, signal } from '@angular/core';
import { EvidenceRef, GapLifecycle, SkillEstimate, SkillGap } from '../models';
import { INITIAL_GAPS } from './mock-data';
import { formatsForSkill } from './recommendations';
import { ProfileService } from './profile.service';
import { DemoStateStore } from './demo-state.store';

/**
 * Écarts de compétence et leur cycle de vie.
 *
 * Un écart détecté pendant une formation active est mis EN_ATTENTE : il est
 * notifié, mais ne bloque pas le cycle en cours. Le superviseur peut le
 * prioriser, ce qui est alors tracé dans l'audit. Toutes les lectures et
 * mutations sont filtrées par l'employé propriétaire.
 */
@Injectable({ providedIn: 'root' })
export class GapService {
  private readonly profileService = inject(ProfileService);
  private readonly store = inject(DemoStateStore);

  private readonly _gaps = signal<SkillGap[]>(
    this.store.read<SkillGap[]>('gaps.items', INITIAL_GAPS),
  );

  readonly allGaps = this._gaps.asReadonly();
  readonly gaps = computed(() =>
    this._gaps().filter((gap) => gap.employeeId === this.profileService.employeeId()),
  );

  readonly actionable = computed(() =>
    this.gaps()
      .filter((gap) => ['NOUVEAU', 'RECONNU', 'TOUJOURS_OUVERT'].includes(gap.status))
      .sort((a, b) => b.gap - a.gap),
  );

  readonly queued = computed(() => this.gaps().filter((gap) => gap.status === 'EN_ATTENTE'));

  readonly inTraining = computed(() =>
    this.gaps().filter((gap) => gap.status === 'EN_FORMATION'),
  );

  readonly resolved = computed(() => this.gaps().filter((gap) => gap.status === 'RESOLU'));

  readonly newCount = computed(
    () => this.gaps().filter((gap) => gap.status === 'NOUVEAU').length,
  );

  constructor() {
    const safe = this._gaps().filter((gap) => !!gap.employeeId);
    if (safe.length !== this._gaps().length) {
      this._gaps.set(safe);
      this.persist();
    }
  }

  byId(id: string, employeeId = this.profileService.employeeId()): SkillGap | undefined {
    if (!employeeId) {
      return undefined;
    }
    return this._gaps().find((gap) => gap.id === id && gap.employeeId === employeeId);
  }

  bySkill(code: string, employeeId = this.profileService.employeeId()): SkillGap | undefined {
    if (!employeeId) {
      return undefined;
    }
    return this._gaps().find((gap) => gap.skillCode === code && gap.employeeId === employeeId);
  }

  acknowledge(id: string, employeeId = this.profileService.employeeId()): void {
    this.patch(id, { status: 'RECONNU' }, employeeId);
  }

  queue(id: string, note: string, employeeId = this.profileService.employeeId()): void {
    this.patch(id, { status: 'EN_ATTENTE', queueNote: note }, employeeId);
  }

  markInTraining(
    id: string,
    requestId: string,
    employeeId = this.profileService.employeeId(),
  ): void {
    this.patch(id, { status: 'EN_FORMATION', requestId }, employeeId);
  }

  markResolved(
    id: string,
    finalLevel: number,
    employeeId = this.profileService.employeeId(),
  ): void {
    const gap = this.byId(id, employeeId);
    this.patch(
      id,
      {
        status: 'RESOLU',
        currentLevel: finalLevel,
        gap: Math.max(0, gap?.targetLevel ?? 0) - finalLevel,
        resolvedAt: new Date().toISOString(),
      },
      employeeId,
    );
  }

  markPartial(
    id: string,
    finalLevel: number,
    employeeId = this.profileService.employeeId(),
  ): void {
    const gap = this.byId(id, employeeId);
    this.patch(
      id,
      {
        status: 'PARTIELLEMENT_RESOLU',
        currentLevel: finalLevel,
        gap: Math.max(0, (gap?.targetLevel ?? 0) - finalLevel),
      },
      employeeId,
    );
  }

  markStillOpen(
    id: string,
    finalLevel: number,
    note: string,
    employeeId = this.profileService.employeeId(),
  ): void {
    const gap = this.byId(id, employeeId);
    this.patch(
      id,
      {
        status: 'TOUJOURS_OUVERT',
        currentLevel: finalLevel,
        gap: Math.max(0, (gap?.targetLevel ?? 0) - finalLevel),
        queueNote: note,
      },
      employeeId,
    );
  }

  reopen(id: string, employeeId = this.profileService.employeeId()): void {
    if (!this.byId(id, employeeId)) {
      return;
    }
    this.patch(
      id,
      { status: 'NOUVEAU', resolvedAt: undefined, detectedAt: new Date().toISOString() },
      employeeId,
    );
  }

  /** Recalcule les écarts à partir des compétences estimées. */
  detectFromSkills(skills: SkillEstimate[], activeTraining: boolean): SkillGap[] {
    const created: SkillGap[] = [];
    for (const skill of skills) {
      const gapSize = skill.target - skill.level;
      const existing = this.bySkill(skill.code, skill.employeeId);

      if (gapSize <= 0) {
        if (existing && existing.status !== 'RESOLU') {
          this.markResolved(existing.id, skill.level, skill.employeeId);
        }
        continue;
      }

      if (existing) {
        const shouldReopen = existing.status === 'RESOLU';
        this._gaps.update((gaps) =>
          gaps.map((gap) =>
            gap.id === existing.id && gap.employeeId === skill.employeeId
              ? {
                  ...gap,
                  currentLevel: skill.level,
                  targetLevel: skill.target,
                  gap: gapSize,
                  confidence: skill.confidence,
                  priority: (gapSize >= 30 ? 'HIGH' : gapSize >= 15 ? 'MEDIUM' : 'LOW') as SkillGap['priority'],
                  status: shouldReopen ? 'NOUVEAU' : gap.status,
                  detectedAt: shouldReopen ? new Date().toISOString() : gap.detectedAt,
                  resolvedAt: shouldReopen ? undefined : gap.resolvedAt,
                  observedFacts: [...skill.evidence.slice(0, 2), ...gap.observedFacts].slice(0, 6),
                }
              : gap,
          ),
        );
        this.persist();
        continue;
      }

      const gap: SkillGap = {
        employeeId: skill.employeeId,
        id: `gap-${skill.employeeId}-${skill.code}`,
        skillCode: skill.code,
        skillLabel: skill.label,
        currentLevel: skill.level,
        targetLevel: skill.target,
        gap: gapSize,
        priority: gapSize >= 30 ? 'HIGH' : gapSize >= 15 ? 'MEDIUM' : 'LOW',
        confidence: skill.confidence,
        observedFacts: skill.evidence.slice(0, 3),
        inference: `Niveau estimé ${skill.level}/100 contre ${skill.target}/100 attendu pour le poste. L’estimation s’appuie sur ${skill.evidence.length} preuve(s) de source ${skill.source.toLowerCase()}.`,
        sources: [skill.source],
        recommendedFormats: formatsForSkill(skill.code),
        status: activeTraining ? 'EN_ATTENTE' : 'NOUVEAU',
        detectedAt: new Date().toISOString(),
        queueNote: activeTraining
          ? 'Détecté pendant une formation active — actionnable à la fin du cycle en cours.'
          : undefined,
      };
      this._gaps.update((gaps) => [gap, ...gaps]);
      created.push(gap);
    }
    if (created.length > 0) {
      this.persist();
    }
    return created;
  }

  /** Crée un écart proposé par la veille technologique. */
  createFromSignal(input: {
    employeeId: string;
    skillCode: string;
    skillLabel: string;
    currentLevel: number;
    targetLevel: number;
    confidence: number;
    inference: string;
    evidence: EvidenceRef;
  }): SkillGap {
    const existing = this.bySkill(input.skillCode, input.employeeId);
    if (existing) {
      return existing;
    }
    const gapSize = Math.max(1, input.targetLevel - input.currentLevel);
    const gap: SkillGap = {
      employeeId: input.employeeId,
      id: `gap-${input.employeeId}-${input.skillCode}`,
      skillCode: input.skillCode,
      skillLabel: input.skillLabel,
      currentLevel: input.currentLevel,
      targetLevel: input.targetLevel,
      gap: gapSize,
      priority: gapSize >= 30 ? 'HIGH' : gapSize >= 15 ? 'MEDIUM' : 'LOW',
      confidence: input.confidence,
      observedFacts: [input.evidence],
      inference: input.inference,
      sources: ['OBSERVED'],
      recommendedFormats: formatsForSkill(input.skillCode),
      status: 'NOUVEAU',
      detectedAt: new Date().toISOString(),
    };
    this._gaps.update((gaps) => [gap, ...gaps]);
    this.persist();
    return gap;
  }

  statusLabel(status: GapLifecycle): string {
    const labels: Record<GapLifecycle, string> = {
      NOUVEAU: 'Nouvel écart',
      EN_ATTENTE: 'En attente',
      RECONNU: 'Pris en compte',
      EN_FORMATION: 'Formation en cours',
      PARTIELLEMENT_RESOLU: 'Partiellement résolu',
      RESOLU: 'Résolu',
      TOUJOURS_OUVERT: 'Toujours ouvert',
    };
    return labels[status];
  }

  /** Efface les données d'un collaborateur sans toucher aux autres espaces. */
  clearEmployee(employeeId: string): void {
    this._gaps.update((gaps) => gaps.filter((gap) => gap.employeeId !== employeeId));
    this.persist();
  }

  reset(): void {
    this._gaps.set(INITIAL_GAPS.map((gap) => ({ ...gap })));
    this.persist();
  }

  private patch(id: string, patch: Partial<SkillGap>, employeeId: string): void {
    if (!employeeId) {
      return;
    }
    this._gaps.update((gaps) =>
      gaps.map((gap) =>
        gap.id === id && gap.employeeId === employeeId ? { ...gap, ...patch } : gap,
      ),
    );
    this.persist();
  }

  private persist(): void {
    this.store.write('gaps.items', this._gaps());
  }
}
