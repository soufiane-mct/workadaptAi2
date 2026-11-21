import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import {
  EvaluationRecord,
  EvaluationReport,
} from '../../core/models';
import { DataService } from '../../core/data/data.service';
import { EvaluationWorkspace } from './evaluation-workspace';

/**
 * Non-régression des messages affichés après une évaluation.
 *
 * Un échec dû au seuil et un échec dû à une exigence bloquante sont deux
 * situations différentes. L'interface doit les expliquer sans laisser croire
 * qu'un score élevé peut compenser une règle éliminatoire.
 */
describe('Évaluation — messages de résultat', () => {
  let fixture: ComponentFixture<EvaluationWorkspace>;

  const record: EvaluationRecord = {
    id: 'eval-resultat',
    requestId: 'request-resultat',
    trainingId: 'training-resultat',
    employeeId: 'emp-0001',
    employeeName: 'Camille Martin',
    method: 'KNOWLEDGE_TEST',
    status: 'CORRIGEE',
    document: {
      method: 'KNOWLEDGE_TEST',
      title: 'Test de connaissances',
      instructions: [],
      durationMinutes: 30,
      sections: [],
    },
    answers: {},
    corrections: [],
    score: 60,
    decision: 'ECHOUE',
    attempt: 1,
    generatedAt: '2026-01-01T00:00:00.000Z',
  };

  function report(overrides: Partial<EvaluationReport> = {}): EvaluationReport {
    return {
      id: 'report-resultat',
      evaluationId: record.id,
      requestId: record.requestId,
      method: record.method,
      score: 60,
      passScore: 75,
      decision: 'ECHOUE',
      criteria: [],
      strengths: [],
      gaps: [],
      feedback: [],
      levelBefore: 40,
      levelAfter: 45,
      recommendations: [],
      at: '2026-01-01T00:05:00.000Z',
      attempt: 1,
      ...overrides,
    };
  }

  function render(result: EvaluationReport): void {
    const fakeData = {
      myRequestById: vi.fn().mockReturnValue(undefined),
      myProgramFor: vi.fn().mockReturnValue(undefined),
      myEvaluationFor: vi.fn().mockReturnValue(record),
      myReportFor: vi.fn().mockReturnValue(result),
      evaluationDraft: vi.fn().mockReturnValue({}),
      myCertificateFor: vi.fn().mockReturnValue(undefined),
      evaluationAttempts: vi.fn().mockReturnValue(1),
      evaluationService: {
        canEvaluate: vi.fn().mockReturnValue({ allowed: true, reason: '' }),
      },
    };

    TestBed.configureTestingModule({
      imports: [EvaluationWorkspace],
      providers: [
        provideRouter([]),
        { provide: DataService, useValue: fakeData },
      ],
    });

    fixture = TestBed.createComponent(EvaluationWorkspace);
    fixture.componentRef.setInput('requestId', record.requestId);
    fixture.detectChanges();
  }

  function text(): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  it('distingue un seuil non atteint d’une exigence bloquante', () => {
    render(report());

    expect(text()).toContain('Seuil de réussite non atteint');
    expect(text()).toContain('score 60/100');
    expect(text()).not.toContain('Exigence bloquante non satisfaite');
  });

  it('explique une exigence bloquante même lorsque le score est élevé', () => {
    render(
      report({
        score: 92,
        blocking: ['Critère éliminatoire non satisfait pour la tâche « Contrôle de sécurité ».'],
      }),
    );

    expect(text()).toContain('Exigence bloquante non satisfaite');
    expect(text()).toContain('Malgré ce score');
    expect(text()).toContain('Critère éliminatoire non satisfait');
  });
});
