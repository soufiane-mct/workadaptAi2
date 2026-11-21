import { beforeEach } from 'vitest';

/**
 * Isolation des tests de démonstration.
 *
 * Les services conservent désormais leur état dans le navigateur. Chaque cas
 * doit donc repartir d'un stockage vierge, sinon une exécution précédente peut
 * modifier le nombre de demandes, de compétences ou de notifications attendu.
 */
beforeEach(() => {
  localStorage.clear();
});
