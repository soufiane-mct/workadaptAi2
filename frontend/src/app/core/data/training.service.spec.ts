import { TestBed } from '@angular/core/testing';
import { MultimediaProgram, ProjectProgram, SkillGap, TrainingFormat } from '../models';
import { GapService } from './gap.service';
import { StepVerificationService } from './step-verification.service';
import { TrainingService } from './training.service';

/**
 * Non-régression des conditions de fin de parcours.
 *
 * Le temps crédité par unité doit toujours pouvoir atteindre la condition
 * de fin (program.completion.minMinutes). Sinon le parcours est impossible
 * à terminer : l'employé a tout fait mais la boucle reste bloquée.
 */
describe('TrainingService — conditions de fin atteignables', () => {
  let training: TrainingService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    training = TestBed.inject(TrainingService);
  });

  function gap(): SkillGap {
    return TestBed.inject(GapService).gaps()[0] as SkillGap;
  }

  /** Génère un parcours approuvé et démarré pour le format donné. */
  function started(format: TrainingFormat): string {
    const request = training.generateForGap({ gap: gap(), format });
    training.approve(request.id, 'Parcours approuvé pour le test.');
    training.start(request.id);
    return request.id;
  }

  /** Valide une unité avec une preuve complète et la crédite. */
  function validateUnit(requestId: string, unitId: string, format: TrainingFormat, minutes: number): void {
    const verification = TestBed.inject(StepVerificationService);
    const verdict = verification.verify({
      requestId,
      unitId,
      unitTitle: unitId,
      format,
      notions: [],
      evidence: {
        unitId,
        format,
        kind: 'TEXTE',
        steps: [
          { label: 'Étape imposée 1', done: true },
          { label: 'Étape imposée 2', done: true },
        ],
        criteria: [
          {
            label: 'Critère de réussite',
            done: true,
            detail: 'Résultat observé et consigné dans l’environnement de démonstration.',
          },
        ],
        narrative:
          'Travail réalisé, résultat observé, décisions tracées et procédure de reprise documentée.',
        durationMinutes: 0,
        expectedMinutes: minutes,
      },
    });
    expect(verdict.verdict).toBe('VALIDE');
    expect(training.completeUnit(requestId, unitId, { minutes }).ok).toBe(true);
  }

  it('permet de terminer un parcours PROJECT (le crédit covers la durée de curriculum)', () => {
    const requestId = started('PROJECT');
    const program = training.programFor(requestId)! as ProjectProgram;
    const progress = training.progressFor(requestId)!;

    for (const unit of progress.units) {
      const milestone = program.milestones.find((item) => item.id === unit.unitId)!;
      validateUnit(requestId, unit.unitId, 'PROJECT', milestone.estimatedMinutes);
    }
    training.submitCapstone(requestId, 'Livrable final complet et revue par un pair.');
    const outcome = training.complete(requestId);

    expect(outcome.ok).toBe(true);
    expect(training.requestById(requestId)!.status).toBe('COMPLETED');
  });

  it('rend la condition de fin atteignable après un ajustement de volume du superviseur', () => {
    const request = training.generateForGap({ gap: gap(), format: 'MULTIMEDIA' });
    training.requestChanges({
      requestId: request.id,
      note: 'Volume porté à 20 h.',
      removedUnitIds: [],
      adjustedHours: 20,
    });

    const program = training.programFor(request.id)! as MultimediaProgram;
    const credited = program.episodes.reduce((sum, episode) => sum + episode.estimatedMinutes, 0);

    expect(program.estimatedHours).toBe(20);
    expect(program.completion.minMinutes).toBe(1200);
    expect(credited).toBeGreaterThanOrEqual(program.completion.minMinutes);
  });

  it('rend la condition de fin atteignable après un retrait d’unités', () => {
    const request = training.generateForGap({ gap: gap(), format: 'MULTIMEDIA' });
    const initial = training.programFor(request.id)! as MultimediaProgram;
    const removed = initial.episodes.slice(0, 2).map((episode) => episode.id);

    training.requestChanges({
      requestId: request.id,
      note: 'Deux épisodes retirés.',
      removedUnitIds: removed,
      adjustedHours: 8,
    });

    const program = training.programFor(request.id)! as MultimediaProgram;
    const credited = program.episodes.reduce((sum, episode) => sum + episode.estimatedMinutes, 0);

    expect(program.episodes.length).toBe(initial.episodes.length - 2);
    expect(program.completion.requiredUnits).toBe(program.episodes.length);
    expect(credited).toBeGreaterThanOrEqual(program.completion.minMinutes);
  });
});
