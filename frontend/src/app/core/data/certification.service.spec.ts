import { TestBed } from '@angular/core/testing';
import {
  EvaluationAnswers,
  KnowledgeTestDocument,
  SkillGap,
  TechnicalChallengeDocument,
} from '../models';
import { CertificationService } from './certification.service';
import { EvaluationService } from './evaluation.service';
import { GapService } from './gap.service';
import { StepVerificationService } from './step-verification.service';
import { TrainingService } from './training.service';

/**
 * Non-régression du cycle évaluation → certification.
 *
 * Règles :
 * - un échec ne délivre aucun certificat et ouvre une remédiation ;
 * - l'employé peut relire son parcours et repasser une autre épreuve ;
 * - une réussite délivre le certificat et ferme la remédiation devenue
 *   inutile (le superviseur n'a plus à l'approuver) ;
 * - le certificat est unique : aucune nouvelle évaluation après la réussite.
 */
describe('CertificationService — échec, reprise, certificat', () => {
  let training: TrainingService;
  let evaluation: EvaluationService;
  let certification: CertificationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    training = TestBed.inject(TrainingService);
    evaluation = TestBed.inject(EvaluationService);
    certification = TestBed.inject(CertificationService);
  });

  /** Parcours terminé : toutes les unités validées par l'agent + preuve de fin. */
  function completedTraining(): string {
    const gap = TestBed.inject(GapService).gaps()[0] as SkillGap;
    const request = training.generateForGap({ gap, format: 'PRACTICAL' });
    training.approve(request.id, 'Curriculum complet vérifié.');
    training.start(request.id);

    const program = training.programFor(request.id);
    const progress = training.progressFor(request.id);
    expect(program).toBeTruthy();
    expect(progress).toBeTruthy();

    const units = progress!.units;
    const minutes = Math.ceil((program!.estimatedHours * 60) / units.length) + 15;
    const verification = TestBed.inject(StepVerificationService);
    for (const unit of units) {
      const verdict = verification.verify({
        requestId: request.id,
        unitId: unit.unitId,
        unitTitle: unit.unitId,
        format: 'PRACTICAL',
        notions: [],
        evidence: {
          unitId: unit.unitId,
          format: 'PRACTICAL',
          kind: 'TEXTE',
          steps: [{ label: 'Consigne du laboratoire exécutée', done: true }],
          criteria: [
            {
              label: 'Critère de réussite du laboratoire',
              done: true,
              detail:
                'Sortie de commande observée dans l’environnement isolé, résultat contrôlé et consigné.',
            },
          ],
          narrative:
            'Commandes réellement exécutées sur l’environnement isolé du laboratoire, sorties observées, critère de réussite contrôlé et procédure de reprise documentée.',
          durationMinutes: 30,
          expectedMinutes: 30,
        },
      });
      expect(verdict.verdict).toBe('VALIDE');
      expect(
        training.completeUnit(request.id, unit.unitId, { minutes, checkpointPassed: true }).ok,
      ).toBe(true);
    }
    training.submitCapstone(
      request.id,
      'Livrable complet, journal des décisions et preuves de vérification.',
    );
    expect(training.complete(request.id).ok).toBe(true);
    return request.id;
  }

  /** Première tentative : copie fausse → échec. */
  function failedAttempt(requestId: string): void {
    expect(evaluation.open(requestId, 'KNOWLEDGE_TEST').ok).toBe(true);
    evaluation.start(requestId);
    const document = evaluation.forRequest(requestId)!.document as KnowledgeTestDocument;
    const answers: EvaluationAnswers = {};
    for (const section of document.sections) {
      for (const question of section.questions) {
        if (question.type === 'OPEN' || question.type === 'TECHNICAL') {
          answers[question.id] = 'Je ne sais pas répondre à cette question.';
        } else {
          const wrong = question.options.findIndex(
            (_, index) => !question.correctIndexes.includes(index),
          );
          answers[question.id] = [wrong >= 0 ? wrong : 0];
        }
      }
    }
    expect(evaluation.submit(requestId, answers)!.decision).toBe('ECHOUE');
    certification.finalize(evaluation.forRequest(requestId)!.id);
  }

  /** Seconde tentative : épreuve technique, tous les critères cochés → réussite. */
  function successfulAttempt(requestId: string): void {
    expect(evaluation.open(requestId, 'TECHNICAL_CHALLENGE').ok).toBe(true);
    evaluation.start(requestId);
    const document = evaluation.forRequest(requestId)!.document as TechnicalChallengeDocument;
    const answers: EvaluationAnswers = {};
    for (const task of document.tasks) {
      answers[task.id] = task.successCriteria.map((_, index) => index);
    }
    expect(evaluation.submit(requestId, answers)!.decision).toBe('REUSSI');
    certification.finalize(evaluation.forRequest(requestId)!.id);
  }

  function remediationFor(requestId: string) {
    return training
      .requests()
      .find((request) => request.origin === 'REMEDIATION' && request.remediationOf === requestId);
  }

  it('n’émet aucun certificat et ouvre une remédiation après un échec', () => {
    const requestId = completedTraining();
    failedAttempt(requestId);

    expect(certification.forRequest(requestId)).toBeUndefined();
    expect(remediationFor(requestId)).toBeTruthy();
    expect(remediationFor(requestId)!.status).toBe('PENDING');
  });

  it('permet de repasser une autre épreuve après un échec', () => {
    const requestId = completedTraining();
    failedAttempt(requestId);

    const reopened = evaluation.open(requestId, 'CASE_ANALYSIS');

    expect(reopened.ok).toBe(true);
    expect(evaluation.attempts(requestId)).toBe(2);
    expect(evaluation.forRequest(requestId)!.attempt).toBe(2);
    expect(evaluation.forRequest(requestId)!.method).toBe('CASE_ANALYSIS');
  });

  it('délivre le certificat et ferme la remédiation devenue inutile', () => {
    const requestId = completedTraining();
    failedAttempt(requestId);
    successfulAttempt(requestId);

    expect(certification.forRequest(requestId)).toBeTruthy();
    expect(remediationFor(requestId)!.status).toBe('CANCELLED');
  });

  it('refuse toute nouvelle évaluation après un certificat délivré', () => {
    const requestId = completedTraining();
    successfulAttempt(requestId);

    const refused = evaluation.open(requestId, 'CASE_ANALYSIS');

    expect(refused.ok).toBe(false);
    expect(refused.message).toContain('certificat');
  });
});
