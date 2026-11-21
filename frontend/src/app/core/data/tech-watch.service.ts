import { computed, inject, Injectable, signal } from '@angular/core';
import { EvidenceRef, TechSignal } from '../models';
import { AuditService } from './audit.service';
import { DemoStateStore } from './demo-state.store';
import { GapService } from './gap.service';
import { NotificationService } from './notification.service';
import { ProfileService } from './profile.service';
import { INITIAL_TECH_SIGNALS } from './mock-data';

/**
 * Veille technologique (agent dédié, CDC §9.3).
 *
 * La veille ne crée pas de formation : elle propose un signal, que
 * l'employé ou son superviseur peut transformer en écart à traiter. Les
 * signaux sont stockés dans l'espace du collaborateur concerné.
 */
@Injectable({ providedIn: 'root' })
export class TechWatchService {
  private readonly gapService = inject(GapService);
  private readonly notifications = inject(NotificationService);
  private readonly audit = inject(AuditService);
  private readonly profileService = inject(ProfileService);
  private readonly store = inject(DemoStateStore);

  private readonly _signals = signal<TechSignal[]>(
    this.store.read<TechSignal[]>('tech-watch.signals', INITIAL_TECH_SIGNALS),
  );

  readonly signals = computed(() =>
    this._signals().filter((signal) => signal.employeeId === this.profileService.employeeId()),
  );

  readonly highRelevance = computed(() =>
    this.signals().filter((signal) => signal.relevance === 'HAUTE'),
  );

  readonly byMaturity = computed(() => ({
    emergent: this.signals().filter((signal) => signal.maturity === 'EMERGENTE').length,
    adoption: this.signals().filter((signal) => signal.maturity === 'ADOPTION').length,
    mature: this.signals().filter((signal) => signal.maturity === 'MATURE').length,
  }));

  bySkill(code: string): TechSignal[] {
    return this.signals().filter((signal) => signal.skillCode === code);
  }

  /** Transforme un signal en écart proposé, avec preuve horodatée. */
  promote(signalId: string): { ok: boolean; message: string } {
    const signal = this.signals().find((item) => item.id === signalId);
    if (!signal) {
      return { ok: false, message: 'Signal introuvable dans votre espace.' };
    }

    const existing = this.gapService.bySkill(signal.skillCode, signal.employeeId);
    if (existing) {
      return {
        ok: false,
        message: `Un écart existe déjà sur ${signal.skillLabel} (${existing.currentLevel}/${existing.targetLevel}).`,
      };
    }

    const evidence: EvidenceRef = {
      id: `ev-tw-${signal.id}`,
      at: new Date().toISOString(),
      source: 'TECH_WATCH',
      statement: `${signal.technology} — ${signal.category} : ${signal.why}`,
      observed: false,
      confidence: 0.6,
    };

    const gap = this.gapService.createFromSignal({
      employeeId: signal.employeeId,
      skillCode: signal.skillCode,
      skillLabel: signal.skillLabel,
      currentLevel: 25,
      targetLevel: 60,
      confidence: 0.6,
      inference: `La veille identifie ${signal.technology} comme pertinente (${signal.relevance.toLowerCase()}). Aucune pratique observée pour l’instant : le niveau est estimé bas et devra être confirmé par une évaluation.`,
      evidence,
    });

    this.notifications.notify({
      type: 'GAP_DETECTED',
      title: `Écart proposé depuis la veille : ${signal.skillLabel}`,
      message: `${signal.technology} a été transformé en écart à traiter. Une évaluation confirmera le niveau réel.`,
      audience: ['EMPLOYEE', 'MANAGER'],
      link: `/app/ecarts/${gap.id}`,
      employeeId: signal.employeeId,
    });

    this.audit.log({
      actor: 'Agent de veille technologique',
      action: 'Signal transformé en écart',
      target: signal.id,
      detail: `${signal.technology} → écart ${signal.skillCode}.`,
    });

    return { ok: true, message: `Écart créé sur ${signal.skillLabel}.` };
  }

  dismiss(signalId: string): void {
    const employeeId = this.profileService.employeeId();
    this._signals.update((signals) =>
      signals.filter((signal) => !(signal.id === signalId && signal.employeeId === employeeId)),
    );
    this.persist();
  }

  clearEmployee(employeeId: string): void {
    this._signals.update((signals) => signals.filter((signal) => signal.employeeId !== employeeId));
    this.persist();
  }

  reset(): void {
    this._signals.set(INITIAL_TECH_SIGNALS.map((signal) => ({ ...signal })));
    this.persist();
  }

  private persist(): void {
    this.store.write('tech-watch.signals', this._signals());
  }
}
