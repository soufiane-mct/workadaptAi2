import { computed, Injectable, signal } from '@angular/core';
import { EvidenceRef, GapLifecycle, SkillEstimate, SkillGap } from '../models';
import { INITIAL_GAPS } from './mock-data';
import { formatsForSkill } from './recommendations';

/**
 * Écarts de compétence et leur cycle de vie.
 *
 * Un écart détecté pendant une formation active est mis EN_ATTENTE : il est
 * notifié, mais ne bloque pas le cycle en cours. Le superviseur peut le
 * prioriser, ce qui est alors tracé dans l’audit.
 */
@Injectable({ providedIn: 'root' })
export class GapService {
  private readonly _gaps = signal<SkillGap[]>(INITIAL_GAPS);
  readonly gaps = this._gaps.asReadonly();

  readonly actionable = computed(() =>
    this._gaps()
      .filter((gap) => ['NOUVEAU', 'RECONNU', 'TOUJOURS_OUVERT'].includes(gap.status))
      .sort((a, b) => b.gap - a.gap),
  );

  readonly queued = computed(() => this._gaps().filter((gap) => gap.status === 'EN_ATTENTE'));

  readonly inTraining = computed(() => this._gaps().filter((gap) => gap.status === 'EN_FORMATION'));

  readonly resolved = computed(() => this._gaps().filter((gap) => gap.status === 'RESOLU'));

  readonly newCount = computed(
    () => this._gaps().filter((gap) => gap.status === 'NOUVEAU').length,
  );

  byId(id: string): SkillGap | undefined {
    return this._gaps().find((gap) => gap.id === id);
  }

  bySkill(code: string): SkillGap | undefined {
    return this._gaps().find((gap) => gap.skillCode === code);
  }

  acknowledge(id: string): void {
    this.patch(id, { status: 'RECONNU' });
  }

  queue(id: string, note: string): void {
    this.patch(id, { status: 'EN_ATTENTE', queueNote: note });
  }

  markInTraining(id: string, requestId: string): void {
    this.patch(id, { status: 'EN_FORMATION', requestId });
  }

  markResolved(id: string, finalLevel: number): void {
    this.patch(id, {
      status: 'RESOLU',
      currentLevel: finalLevel,
      gap: Math.max(0, this.byId(id)?.targetLevel ?? 0) - finalLevel,
      resolvedAt: new Date().toISOString(),
    });
  }

  markPartial(id: string, finalLevel: number): void {
    this.patch(id, {
      status: 'PARTIELLEMENT_RESOLU',
      currentLevel: finalLevel,
      gap: Math.max(0, (this.byId(id)?.targetLevel ?? 0) - finalLevel),
    });
  }

  markStillOpen(id: string, finalLevel: number, note: string): void {
    this.patch(id, {
      status: 'TOUJOURS_OUVERT',
      currentLevel: finalLevel,
      gap: Math.max(0, (this.byId(id)?.targetLevel ?? 0) - finalLevel),
      queueNote: note,
    });
  }

  reopen(id: string): void {
    const gap = this.byId(id);
    if (!gap) {
      return;
    }
    this.patch(id, { status: 'NOUVEAU', resolvedAt: undefined, detectedAt: new Date().toISOString() });
  }

  /** Recalcule les écarts à partir des compétences estimées. */
  detectFromSkills(skills: SkillEstimate[], activeTraining: boolean): SkillGap[] {
    const created: SkillGap[] = [];
    for (const skill of skills) {
      const gapSize = skill.target - skill.level;
      const existing = this.bySkill(skill.code);

      if (gapSize <= 0) {
        if (existing && existing.status !== 'RESOLU') {
          this.markResolved(existing.id, skill.level);
        }
        continue;
      }

      if (existing) {
        const shouldReopen = existing.status === 'RESOLU';
        this._gaps.update((gaps) =>
          gaps.map((gap) =>
            gap.id === existing.id
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
        continue;
      }

      const gap: SkillGap = {
        id: `gap-${skill.code}`,
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
    return created;
  }

  /** Crée un écart proposé par la veille technologique. */
  createFromSignal(input: {
    skillCode: string;
    skillLabel: string;
    currentLevel: number;
    targetLevel: number;
    confidence: number;
    inference: string;
    evidence: EvidenceRef;
  }): SkillGap {
    const existing = this.bySkill(input.skillCode);
    if (existing) {
      return existing;
    }
    const gapSize = Math.max(1, input.targetLevel - input.currentLevel);
    const gap: SkillGap = {
      id: `gap-${input.skillCode}`,
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

  private patch(id: string, patch: Partial<SkillGap>): void {
    this._gaps.update((gaps) => gaps.map((gap) => (gap.id === id ? { ...gap, ...patch } : gap)));
  }
}
