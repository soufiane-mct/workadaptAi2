import { computed, inject, Injectable, signal } from '@angular/core';
import { EvidenceRef, TechSignal } from '../models';
import { AuditService } from './audit.service';
import { GapService } from './gap.service';
import { NotificationService } from './notification.service';
import { INITIAL_TECH_SIGNALS } from './mock-data';

/**
 * Veille technologique (agent dédié, CDC §9.3).
 *
 * La veille ne crée pas de formation : elle propose un signal, que
 * l'employé ou son superviseur peut transformer en écart à traiter.
 */
@Injectable({ providedIn: 'root' })
export class TechWatchService {
  private readonly gapService = inject(GapService);
  private readonly notifications = inject(NotificationService);
  private readonly audit = inject(AuditService);

  private readonly _signals = signal<TechSignal[]>(INITIAL_TECH_SIGNALS);
  readonly signals = this._signals.asReadonly();

  readonly highRelevance = computed(() =>
    this._signals().filter((signal) => signal.relevance === 'HAUTE'),
  );

  readonly byMaturity = computed(() => ({
    emergent: this._signals().filter((signal) => signal.maturity === 'EMERGENTE').length,
    adoption: this._signals().filter((signal) => signal.maturity === 'ADOPTION').length,
    mature: this._signals().filter((signal) => signal.maturity === 'MATURE').length,
  }));

  bySkill(code: string): TechSignal[] {
    return this._signals().filter((signal) => signal.skillCode === code);
  }

  /** Transforme un signal en écart proposé, avec preuve horodatée. */
  promote(signalId: string): { ok: boolean; message: string } {
    const signal = this._signals().find((item) => item.id === signalId);
    if (!signal) {
      return { ok: false, message: 'Signal introuvable.' };
    }

    const existing = this.gapService.bySkill(signal.skillCode);
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

    this.gapService.createFromSignal({
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
      link: `/app/ecarts/gap-${signal.skillCode}`,
      employeeId: 'emp-0001',
    });

    this.audit.log({
      actor: 'Technology Watch Agent',
      action: 'Signal transformé en écart',
      target: signal.id,
      detail: `${signal.technology} → écart ${signal.skillCode}.`,
    });

    return { ok: true, message: `Écart créé sur ${signal.skillLabel}.` };
  }

  dismiss(signalId: string): void {
    this._signals.update((signals) => signals.filter((signal) => signal.id !== signalId));
  }
}
