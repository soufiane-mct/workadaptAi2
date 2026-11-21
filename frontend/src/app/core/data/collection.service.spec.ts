import { TestBed } from '@angular/core/testing';
import { AuthService } from '../auth/auth.service';
import { CollectionService } from './collection.service';
import { DemoStateStore } from './demo-state.store';
import { GapService } from './gap.service';
import { ProfileService } from './profile.service';

/**
 * Non-régression du fil de collecte.
 *
 * La collecte est permanente dans le shell : elle produit des exécutions et
 * des événements persistés. La fin de formation et le résultat d'évaluation
 * doivent ensuite réinjecter leurs propres événements dans ce même fil et
 * recalculer l'écart du collaborateur.
 */
describe('CollectionService — collecte permanente et réinjection', () => {
  let collection: CollectionService;
  let gaps: GapService;
  let profile: ProfileService;
  let auth: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    collection = TestBed.inject(CollectionService);
    gaps = TestBed.inject(GapService);
    profile = TestBed.inject(ProfileService);
    auth = TestBed.inject(AuthService);
  });

  it('exécute une collecte quotidienne et conserve sa trace locale', () => {
    const beforeEvents = collection.events().length;
    const beforeRuns = collection.runs().length;

    const run = collection.runDailyCollection({ silent: true });

    expect(run.kind).toBe('DAILY');
    expect(run.status).toBe('SUCCESS');
    expect(run.eventsCount).toBeGreaterThan(0);
    expect(collection.events().length).toBe(beforeEvents + run.eventsCount);
    expect(collection.runs().length).toBe(beforeRuns + 1);

    const store = TestBed.inject(DemoStateStore);
    const envelope = JSON.parse(localStorage.getItem('workadapt.demo-state.v1') ?? '{}') as {
      version?: number;
      data?: Record<string, unknown>;
    };
    expect(envelope.version).toBe(store.version);
    expect(envelope.data?.['collection.events']).toBeDefined();
    expect(envelope.data?.['collection.runs']).toBeDefined();
  });

  it('réinjecte la fin de formation et laisse l’écart partiellement résolu', () => {
    const gap = gaps.gaps().find((item) => item.skillCode === 'docker')!;
    const before = collection.events().length;

    const result = collection.recordTrainingCompletion({
      requestId: 'treq-reinjection-formation',
      programTitle: 'Parcours de démonstration',
      skillCode: gap.skillCode,
      skillLabel: gap.skillLabel,
      levelFrom: gap.currentLevel,
      levelTo: gap.targetLevel,
      minutesSpent: 120,
      unitsDone: 2,
      proof: 'Preuve de fin vérifiée et déposée.',
    });

    expect(result.length).toBeGreaterThan(0);
    expect(collection.events().length).toBe(before + 1);
    expect(
      collection.events().some(
        (item) =>
          item.source === 'TRAINING_COMPLETION' &&
          item.type === 'TRAINING_DONE' &&
          item.employeeId === 'emp-0001',
      ),
    ).toBe(true);
    expect(gaps.byId(gap.id, 'emp-0001')?.status).toBe('PARTIELLEMENT_RESOLU');
  });

  it('réinjecte le résultat d’évaluation et clôture l’écart après réussite', () => {
    const gap = gaps.gaps().find((item) => item.skillCode === 'docker')!;
    const before = collection.events().length;

    collection.recordEvaluationResult({
      requestId: 'treq-reinjection-evaluation',
      evaluationId: 'eval-reinjection-evaluation',
      methodLabel: 'Épreuve technique',
      skillCode: gap.skillCode,
      skillLabel: gap.skillLabel,
      levelAfter: gap.targetLevel,
      passed: true,
      score: 88,
      note: 'Certificat de démonstration délivré.',
    });

    expect(collection.events().length).toBe(before + 1);
    expect(
      collection.events().some(
        (item) =>
          item.source === 'EVALUATION_RESULT' &&
          item.type === 'ASSESSMENT_DONE' &&
          item.employeeId === 'emp-0001',
      ),
    ).toBe(true);
    expect(gaps.byId(gap.id, 'emp-0001')?.status).toBe('RESOLU');
  });

  it('ne mélange pas les événements de deux espaces collaborateur', () => {
    const registered = auth.register({
      firstName: 'Nora',
      lastName: 'Martin',
      email: 'nora.collection@exemple.test',
      jobTitle: 'Analyste',
      department: 'Opérations',
    });

    expect(collection.events()).toEqual([]);
    expect(collection.runs()).toEqual([]);
    expect(profile.employeeId()).toBe(registered.employeeId);
  });

  it('active la planification automatique sans la laisser active après arrêt', () => {
    expect(collection.autoCollect()).toBe(true);
    expect(collection.autoIntervalMinutes).toBe(3);

    collection.startAutoCollection();
    collection.stopAutoCollection();

    expect(collection.autoCollect()).toBe(true);
  });
});
