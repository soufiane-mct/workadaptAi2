import { toneForStatus } from './status-chip';

describe('toneForStatus', () => {
  it('associe les statuts terminés à la teinte succès', () => {
    for (const status of ['APPROVED', 'DONE', 'COMPLETED', 'CONNECTED', 'ACTIVE', 'RUNNING']) {
      expect(toneForStatus(status)).toBe('success');
    }
  });

  it('associe les statuts en attente à la teinte avertissement', () => {
    for (const status of [
      'PENDING',
      'PENDING_APPROVAL',
      'IN_PROGRESS',
      'WAITING_APPROVAL',
      'PARTIAL',
      'INVITED',
    ]) {
      expect(toneForStatus(status)).toBe('warning');
    }
  });

  it('associe les échecs et désactivations à la teinte danger', () => {
    for (const status of ['REJECTED', 'FAILED', 'ERROR', 'DISABLED']) {
      expect(toneForStatus(status)).toBe('danger');
    }
  });

  it('distingue un parcours approuvé mais non démarré', () => {
    expect(toneForStatus('APPROVED_NOT_STARTED')).toBe('info');
  });

  it('retombe sur la teinte neutre pour un statut inconnu', () => {
    expect(toneForStatus('STATUT_INCONNU')).toBe('neutral');
    expect(toneForStatus('')).toBe('neutral');
  });
});
