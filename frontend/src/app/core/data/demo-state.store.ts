import { Injectable, signal, untracked } from '@angular/core';

/**
 * Version de schéma du stockage local de démonstration.
 *
 * Toute évolution incompatible doit incrémenter ce numéro : les anciennes
 * données sont alors ignorées proprement au lieu de produire un état
 * partiellement déprécié difficile à diagnostiquer.
 */
export const DEMO_STATE_VERSION = 1;

const STORAGE_KEY = `workadapt.demo-state.v${DEMO_STATE_VERSION}`;

interface DemoStateEnvelope {
  version: number;
  savedAt: string;
  data: Record<string, unknown>;
}

/**
 * Stockage local versionné pour l'état de démonstration.
 *
 * Le frontend reste entièrement autonome : aucun serveur n'est requis pour
 * explorer le produit. Les données sont néanmoins séparées par domaine et
 * peuvent être réinitialisées sans effacer la session du navigateur.
 */
@Injectable({ providedIn: 'root' })
export class DemoStateStore {
  private readonly _data = signal<Record<string, unknown>>(this.restore());

  readonly version = DEMO_STATE_VERSION;
  readonly data = this._data.asReadonly();

  read<T>(key: string, fallback: T): T {
    const value = this._data()[key];
    return value === undefined ? fallback : (value as T);
  }

  write<T>(key: string, value: T): void {
    this._data.update((data) => ({ ...data, [key]: value }));
    this.persist();
  }

  remove(key: string): void {
    this._data.update((data) => {
      const next = { ...data };
      delete next[key];
      return next;
    });
    this.persist();
  }

  /** Efface l'état de démonstration versionné sans toucher aux autres clés. */
  clear(): void {
    this._data.set({});
    this.persist();
  }

  private persist(): void {
    // La lecture de l'enveloppe ne doit jamais devenir une dépendance des
    // effets Angular qui persistent leur domaine. Sans `untracked`, chaque
    // écriture dans le store invaliderait l'effet qui vient de l'écrire et
    // provoquerait une boucle de changement de détection.
    const data = untracked(this._data);
    const envelope: DemoStateEnvelope = {
      version: DEMO_STATE_VERSION,
      savedAt: new Date().toISOString(),
      data,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(envelope));
    } catch {
      // Le mode privé ou un quota atteint ne doit pas faire tomber l'écran.
      // L'état reste disponible en mémoire pour la session courante.
    }
  }

  private restore(): Record<string, unknown> {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return {};
      }
      const parsed = JSON.parse(raw) as Partial<DemoStateEnvelope>;
      if (parsed.version !== DEMO_STATE_VERSION || !parsed.data) {
        return {};
      }
      return parsed.data;
    } catch {
      return {};
    }
  }
}
