import { TestBed } from '@angular/core/testing';
import { DataService } from './data.service';

describe('DataService', () => {
  let service: DataService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DataService);
  });

  it('expose les compétences de démonstration', () => {
    expect(service.skills().length).toBeGreaterThan(0);
  });

  it('respecte le format des estimations : niveau et cible entre 0 et 100', () => {
    for (const skill of service.skills()) {
      expect(skill.level).toBeGreaterThanOrEqual(0);
      expect(skill.level).toBeLessThanOrEqual(100);
      expect(skill.target).toBeGreaterThanOrEqual(0);
      expect(skill.target).toBeLessThanOrEqual(100);
      expect(skill.confidence).toBeGreaterThan(0);
      expect(skill.confidence).toBeLessThanOrEqual(1);
      expect(skill.evidence.length).toBeGreaterThan(0);
    }
  });

  it("applique une décision d'approbation et la retire des demandes en attente", () => {
    const [first] = service.pendingApprovals();
    expect(first).toBeDefined();

    service.decideApproval(first.id, 'APPROVED');

    const updated = service.approvals().find((request) => request.id === first.id);
    expect(updated?.status).toBe('APPROVED');
    expect(service.pendingApprovals().some((request) => request.id === first.id)).toBe(false);
  });

  it('met à jour la progression d’un module et recalcule celle du parcours', () => {
    const course = service.courses().find((item) => item.status === 'IN_PROGRESS');
    expect(course).toBeDefined();

    service.setModuleProgress(course!.id, course!.modules[0].order, 100);

    const updated = service.courses().find((item) => item.id === course!.id)!;
    expect(updated.modules[0].status).toBe('DONE');
    expect(updated.progress).toBeGreaterThanOrEqual(0);
    expect(updated.progress).toBeLessThanOrEqual(100);
  });

  it('ne propose que des parcours actifs cohérents', () => {
    const active = service.activeCourse();
    expect(active).not.toBeNull();
    expect(active!.modules.length).toBeGreaterThan(0);
  });

  it('expose un historique des évolutions traçable', () => {
    const history = service.skillHistory();
    expect(history.length).toBeGreaterThan(0);

    for (const entry of history) {
      expect(entry.cause.length).toBeGreaterThan(10);
      expect(entry.previousLevel).toBeGreaterThanOrEqual(0);
      expect(entry.newLevel).toBeLessThanOrEqual(100);
    }
  });

  it('expose les échanges entre agents avec leur état', () => {
    const exchanges = service.agentExchanges();
    expect(exchanges.length).toBeGreaterThan(0);

    for (const exchange of exchanges) {
      expect(exchange.from).not.toBe('');
      expect(exchange.to).not.toBe('');
      expect(['DELIVERED', 'PENDING', 'FAILED']).toContain(exchange.status);
    }
  });
});
