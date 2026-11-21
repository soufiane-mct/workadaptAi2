import {
  EVALUATION_METHOD_INFO,
  EVALUATION_METHOD_LABELS,
  EVALUATION_METHODS,
  FORMAT_LABELS,
  TRAINING_FORMATS,
  TrainingFormat,
} from '../models';
import { knowledgeFor } from './knowledge';
import { KPIS } from './mock-data';
import { buildProgram } from './training/builders';

/**
 * Contrats produit non-régressifs.
 *
 * Ces tests protègent les dimensions visibles du produit : les sept formats,
 * les cinq méthodes, le seuil commun de réussite et les treize KPI. Ils
 * vérifient les contrats eux-mêmes, sans dépendre d'un écran ou d'une API.
 */
describe('Contrats produit — formats, méthodes, seuil et KPI', () => {
  it('expose exactement sept formats de formation distincts', () => {
    expect(TRAINING_FORMATS).toHaveLength(7);
    expect(new Set(TRAINING_FORMATS).size).toBe(7);
    expect(Object.keys(FORMAT_LABELS)).toHaveLength(7);

    for (const format of TRAINING_FORMATS) {
      expect(FORMAT_LABELS[format]).toBeTruthy();
      expect(FORMAT_LABELS[format]).not.toMatch(/^[A-Z_]+$/);
    }
  });

  it('expose exactement cinq méthodes d’évaluation distinctes', () => {
    expect(EVALUATION_METHODS).toHaveLength(5);
    expect(new Set(EVALUATION_METHODS).size).toBe(5);
    expect(Object.keys(EVALUATION_METHOD_LABELS)).toHaveLength(5);
    expect(Object.keys(EVALUATION_METHOD_INFO)).toHaveLength(5);

    for (const method of EVALUATION_METHODS) {
      expect(EVALUATION_METHOD_LABELS[method]).toBeTruthy();
      expect(EVALUATION_METHOD_INFO[method].instrument).toBeTruthy();
      expect(EVALUATION_METHOD_INFO[method].proof).toBeTruthy();
    }
  });

  it('construit un curriculum distinct pour chaque format avec un seuil à 75', () => {
    const formats = new Set<TrainingFormat>();

    for (const format of TRAINING_FORMATS) {
      const program = buildProgram(
        {
          requestId: `contrat-${format}`,
          format,
          skillCode: 'docker',
          skillLabel: 'Docker',
          subject: 'Conteneurisation d’applications',
          domain: 'DEV',
          levelFrom: 45,
          levelTo: 80,
          weeklyHours: 6,
        },
        knowledgeFor('docker', 'Docker', 'Conteneurisation d’applications', 'DEV'),
      );

      expect(program.format).toBe(format);
      expect(program.completion.passScore).toBe(75);
      expect(program.completion.minMinutes).toBeGreaterThan(0);
      expect(program.completion.requiredUnits).toBeGreaterThan(0);
      expect(program.recommendedEvaluation.length).toBeGreaterThan(0);
      formats.add(program.format);
    }

    expect(formats.size).toBe(7);
  });

  it('expose exactement treize KPI uniques et documentés', () => {
    expect(KPIS).toHaveLength(13);
    expect(new Set(KPIS.map((kpi) => kpi.code)).size).toBe(13);

    for (const kpi of KPIS) {
      expect(kpi.label).toBeTruthy();
      expect(kpi.definition).toBeTruthy();
      expect(kpi.target).toBeGreaterThan(0);
      expect(kpi.current).toBeGreaterThanOrEqual(0);
      expect(['PERCENT', 'POINTS', 'MINUTES', 'SECONDS']).toContain(kpi.unit);
      expect(['UP', 'DOWN']).toContain(kpi.direction);
    }
  });
});
