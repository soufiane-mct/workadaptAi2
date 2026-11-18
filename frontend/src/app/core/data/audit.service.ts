import { Injectable, signal } from '@angular/core';
import { AuditEntry } from '../models';
import { INITIAL_AUDIT } from './mock-data';

/** Journal d’audit : toute décision sensible doit être traçable (CDC §9.5, §12.3). */
@Injectable({ providedIn: 'root' })
export class AuditService {
  private readonly _entries = signal<AuditEntry[]>(INITIAL_AUDIT);
  readonly entries = this._entries.asReadonly();

  log(input: { actor: string; action: string; target: string; detail: string; ip?: string }): AuditEntry {
    const entry: AuditEntry = {
      id: `aud-${Date.now()}-${this._entries().length}`,
      at: new Date().toISOString(),
      actor: input.actor,
      action: input.action,
      target: input.target,
      detail: input.detail,
      ip: input.ip ?? '10.0.8.22',
    };
    this._entries.update((entries) => [entry, ...entries]);
    return entry;
  }

  forTarget(target: string): AuditEntry[] {
    return this._entries().filter((entry) => entry.target === target);
  }
}
