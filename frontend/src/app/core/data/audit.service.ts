import { effect, inject, Injectable, signal } from '@angular/core';
import { AuditEntry } from '../models';
import { INITIAL_AUDIT } from './mock-data';
import { DemoStateStore } from './demo-state.store';

/** Journal d'audit : toute décision sensible doit être traçable (CDC §9.5, §12.3). */
@Injectable({ providedIn: 'root' })
export class AuditService {
  private readonly store = inject(DemoStateStore);

  private readonly _entries = signal<AuditEntry[]>(
    this.store.read<AuditEntry[]>('audit.entries', INITIAL_AUDIT),
  );
  readonly entries = this._entries.asReadonly();

  constructor() {
    effect(() => {
      this.store.write('audit.entries', this._entries());
    });
  }

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

  reset(): void {
    this._entries.set(INITIAL_AUDIT.map((entry) => ({ ...entry })));
  }
}
