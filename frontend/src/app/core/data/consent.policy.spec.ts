import { TestBed } from '@angular/core/testing';
import { CollectionService } from './collection.service';
import { DataService } from './data.service';
import { GapService } from './gap.service';
import { ProfileService } from './profile.service';
import { StepVerificationService } from './step-verification.service';
import { TrainingService } from './training.service';

/**
 * Non-régression : le consentement doit avoir un effet métier.
 *
 * - Le retrait du consentement de collecte suspend le parcours en cours et
 *   la collecte des événements pour cet employé (la collecte, elle, ne
 *   s'arrête jamais) ;
 * - le retrait du consentement de partage cache la progression et les
 *   résultats de l'employé au superviseur.
 */
describe('Politique de consentement', () => {
  let data: DataService;
  let training: TrainingService;
  let profile: ProfileService;
  let collection: CollectionService;
  let verification: StepVerificationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    data = TestBed.inject(DataService);
    training = TestBed.inject(TrainingService);
    profile = TestBed.inject(ProfileService);
    collection = TestBed.inject(CollectionService);
    verification = TestBed.inject(StepVerificationService);
  });

  function setConsent(patch: { collect?: boolean; shareWithSupervisor?: boolean }): void {
    const current = profile.profile().consent;
    profile.updateProfile({
      consent: {
        ...current,
        ...patch,
        at: new Date().toISOString(),
      },
    });
  }

  /** Parcours démarré, prêt à être avancé. */
  function startedRequest(): string {
    const gap = TestBed.inject(GapService).gaps()[0]!;
    const request = training.generateForGap({ gap, format: 'MULTIMEDIA' });
    training.approve(request.id, 'Parcours approuvé.');
    training.start(request.id);
    return request.id;
  }

  /** Preuve complète transmise à l'agent pour la première unité. */
  function verifyFirstUnit(requestId: string): string {
    const progress = training.progressFor(requestId)!;
    const unit = progress.units[0];
    verification.verify({
      requestId,
      unitId: unit.unitId,
      unitTitle: unit.unitId,
      format: 'MULTIMEDIA',
      notions: [],
      evidence: {
        unitId: unit.unitId,
        format: 'MULTIMEDIA',
        kind: 'TEXTE',
        steps: [
          { label: 'Vidéo consultée', done: true },
          { label: 'Article lu', done: true },
          { label: 'Podcast écouté', done: true },
          { label: 'Restitution orale effectuée', done: true, detail: 'Restitution des notions clés.' },
        ],
        criteria: [
          {
            label: 'Critère de réussite',
            done: true,
            detail: 'Résultat observé et consigné dans l’environnement de démonstration.',
          },
        ],
        narrative:
          'Supports consultés, restitution orale réalisée et résultat observé puis consigné dans les notes.',
        durationMinutes: 10,
        expectedMinutes: 55,
      },
    });
    return unit.unitId;
  }

  it('suspend le parcours quand le consentement de collecte est retiré', () => {
    const requestId = startedRequest();
    const unitId = verifyFirstUnit(requestId);

    setConsent({ collect: false });
    const refused = training.completeUnit(requestId, unitId, { minutes: 55 });

    expect(refused.ok).toBe(false);
    expect(refused.message).toContain('suspendu');
    expect(training.progressFor(requestId)!.units[0].status).not.toBe('DONE');

    setConsent({ collect: true });
    const accepted = training.completeUnit(requestId, unitId, { minutes: 55 });

    expect(accepted.ok).toBe(true);
  });

  it('ne collecte plus d’événement pour un employé sans consentement', () => {
    setConsent({ collect: false });
    const before = collection.events().length;

    const run = collection.runDailyCollection({ silent: true });

    expect(run.status).toBe('SUCCESS');
    expect(collection.events().length).toBe(before);
    expect(run.eventsCount).toBe(0);
  });

  it('cache la progression de l’employé au superviseur quand le partage est refusé', () => {
    expect(data.followUps().length).toBeGreaterThan(0);

    setConsent({ shareWithSupervisor: false });

    expect(data.followUps().length).toBe(0);
    expect(data.supervisorReports().length).toBe(0);
    expect(data.supervisorCertificates().length).toBe(0);
  });

  it('rend la progression au superviseur quand le partage est rétabli', () => {
    setConsent({ shareWithSupervisor: false });
    expect(data.followUps().length).toBe(0);

    setConsent({ shareWithSupervisor: true });

    expect(data.followUps().length).toBeGreaterThan(0);
  });
});
