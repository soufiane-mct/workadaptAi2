import { TestBed } from '@angular/core/testing';
import { StepEvidence } from '../models';
import { StepVerificationService } from './step-verification.service';

/**
 * Non-régression de l'agent d'analyse des preuves d'étape.
 *
 * Règle structurante : cocher des cases ou cliquer « suivant » ne valide
 * jamais une étape. Seules des traces réellement produites (commandes,
 * observations, décisions, restitution) permettent un verdict VALIDE.
 */
describe('StepVerificationService — agent d’analyse des preuves', () => {
  let service: StepVerificationService;

  const requestId = 'req-test';
  const unitId = 'unit-test';
  const unitTitle = 'Premier laboratoire Docker';

  /** Preuve complète : étapes réalisées, critère observé, restitution écrite. */
  function solidEvidence(overrides: Partial<StepEvidence> = {}): StepEvidence {
    return {
      unitId,
      format: 'PRACTICAL',
      kind: 'TEXTE',
      steps: [{ label: 'Construire l’image', done: true }],
      criteria: [
        {
          label: 'L’image est construite et exécutable',
          done: true,
          detail: 'Sortie de commande observée : image construite et conteneur démarré sans erreur.',
        },
      ],
      narrative:
        'J’ai construit l’image Docker puis lancé le conteneur ; la sortie montre un démarrage sans erreur et le test de santé répond.',
      durationMinutes: 30,
      expectedMinutes: 30,
      ...overrides,
    };
  }

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(StepVerificationService);
  });

  it('valide une preuve complète et documente ce qui a été contrôlé', () => {
    const verdict = service.verify({
      requestId,
      unitId,
      unitTitle,
      format: 'PRACTICAL',
      notions: [],
      evidence: solidEvidence(),
    });

    expect(verdict.verdict).toBe('VALIDE');
    expect(verdict.score).toBeGreaterThanOrEqual(70);
    expect(verdict.gaps.length).toBe(0);
    expect(verdict.checked.length).toBeGreaterThan(0);
    expect(verdict.reviewed.length).toBeGreaterThan(0);
  });

  it('refuse une preuve « clic-only » : cases cochées sans aucune trace', () => {
    const verdict = service.verify({
      requestId,
      unitId,
      unitTitle,
      format: 'PRACTICAL',
      notions: [],
      evidence: {
        unitId,
        format: 'PRACTICAL',
        kind: 'TEXTE',
        steps: [{ label: 'Construire l’image', done: true }],
        criteria: [{ label: 'L’image est construite', done: true }],
        narrative: '',
        durationMinutes: 1,
        expectedMinutes: 30,
      },
    });

    expect(verdict.verdict).not.toBe('VALIDE');
    expect(verdict.verdict).toBe('REJETE');
    expect(verdict.gaps.some((gap) => gap.includes('Validation superficielle'))).toBe(true);
  });

  it('signale une restitution absente même quand tout le reste est fait', () => {
    const verdict = service.verify({
      requestId,
      unitId,
      unitTitle,
      format: 'PRACTICAL',
      notions: [],
      evidence: solidEvidence({ narrative: '' }),
    });

    expect(verdict.verdict).not.toBe('VALIDE');
    expect(verdict.gaps.some((gap) => gap.includes('Restitution'))).toBe(true);
  });

  it('refuse une commande exécutée sans sortie observable', () => {
    const verdict = service.verify({
      requestId,
      unitId,
      unitTitle,
      format: 'PRACTICAL',
      notions: [],
      evidence: solidEvidence({
        kind: 'COMMANDES',
        commands: ['docker build -t demo .'],
        outputs: [''],
      }),
    });

    expect(verdict.verdict).not.toBe('VALIDE');
    expect(verdict.gaps.some((gap) => gap.includes('sortie observable'))).toBe(true);
  });

  it('conserve l’historique des verdicts par unité', () => {
    service.verify({
      requestId,
      unitId,
      unitTitle,
      format: 'PRACTICAL',
      notions: [],
      evidence: solidEvidence({ narrative: '' }),
    });
    const second = service.verify({
      requestId,
      unitId,
      unitTitle,
      format: 'PRACTICAL',
      notions: [],
      evidence: solidEvidence(),
    });

    expect(service.forUnit(requestId, unitId).length).toBe(2);
    expect(service.lastFor(requestId, unitId)!.verdict).toBe('VALIDE');
    expect(second.verdict).toBe('VALIDE');
  });
});
