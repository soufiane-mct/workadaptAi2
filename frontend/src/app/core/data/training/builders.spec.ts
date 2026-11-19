import { TestBed } from '@angular/core/testing';
import { TrainingFormat, TrainingProgram } from '../../models';
import { GapService } from '../gap.service';
import { TrainingService } from '../training.service';
import { capstoneOf, programUnits } from './helpers';

/**
 * Non-régression : les 7 formats de formation sont structurellement
 * distincts. Aucun format ne réutilise l'unité, la progression ou la
 * preuve de fin d'un autre, et aucun programme ne contient de donnée
 * d'évaluation.
 */
const FORMATS: TrainingFormat[] = [
  'MULTIMEDIA',
  'INTERACTIVE',
  'PRACTICAL',
  'PROJECT',
  'SIMULATION',
  'AI_TUTORED',
  'COLLABORATIVE',
];

describe('Formats de formation — 7 structures distinctes', () => {
  let training: TrainingService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    training = TestBed.inject(TrainingService);
  });

  function programFor(format: TrainingFormat): TrainingProgram {
    const gap = TestBed.inject(GapService).gaps()[0];
    const request = training.generateForGap({ gap, format });
    const program = training.programFor(request.id);
    expect(program).toBeTruthy();
    return program!;
  }

  /** Contenu propre au format : c'est lui qui rend les formats distincts. */
  function payloadOf(program: TrainingProgram): unknown[] {
    switch (program.format) {
      case 'MULTIMEDIA':
        return program.episodes;
      case 'INTERACTIVE':
        return program.drillSets;
      case 'PRACTICAL':
        return program.labs;
      case 'PROJECT':
        return program.milestones;
      case 'SIMULATION':
        return program.scenarios;
      case 'AI_TUTORED':
        return program.tutorSessions;
      case 'COLLABORATIVE':
        return program.sprints;
      default:
        return [];
    }
  }

  it('génère un parcours complet pour chacun des 7 formats', () => {
    for (const format of FORMATS) {
      const program = programFor(format);
      expect(program.format).toBe(format);
      const units = programUnits(program);
      // Chaque format a son propre volume d'unités (4 à 12 selon le rythme).
      expect(units.length).toBeGreaterThanOrEqual(4);
      expect(units.length).toBe(program.completion.requiredUnits);
      expect(program.estimatedHours).toBeGreaterThan(0);
      expect(program.estimatedDays).toBeGreaterThan(0);
      expect(payloadOf(program).length).toBe(units.length);
    }
  });

  it('donne à chaque format sa propre unité, sa preuve de fin et son contenu', () => {
    const kinds = new Set<string>();
    const capstones = new Set<string>();
    const signatures = new Set<string>();

    for (const format of FORMATS) {
      const program = programFor(format);
      kinds.add(programUnits(program)[0].kind);

      const capstone = capstoneOf(program);
      capstones.add(`${capstone.title} :: ${capstone.deliverable}`);

      signatures.add(
        JSON.stringify({
          title: program.title,
          summary: program.summary,
          payload: payloadOf(program),
        }),
      );
    }

    expect(kinds.size).toBe(7);
    expect(capstones.size).toBe(7);
    expect(signatures.size).toBe(7);
  });

  it('exige des conditions de fin propres à chaque format', () => {
    const labels = new Set<string>();
    for (const format of FORMATS) {
      const program = programFor(format);
      expect(program.completion.requireCapstone).toBe(true);
      expect(program.completion.passScore).toBe(75);
      expect(program.completion.minMinutes).toBeGreaterThan(0);
      labels.add(program.completion.evidenceLabel);
    }
    expect(labels.size).toBe(7);
  });

  it("n'intègre aucune donnée d'évaluation dans un programme de formation", () => {
    for (const format of FORMATS) {
      const program = programFor(format) as unknown as Record<string, unknown>;
      expect(program['score']).toBeUndefined();
      expect(program['decision']).toBeUndefined();
      expect(program['certificateId']).toBeUndefined();
      expect(program['units']).toBeUndefined();
      expect(program['steps']).toBeUndefined();
      expect(program['progress']).toBeUndefined();
    }
  });
});
