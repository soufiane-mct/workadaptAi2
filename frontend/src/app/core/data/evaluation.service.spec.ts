import { TestBed } from '@angular/core/testing';
import {
  EvaluationAnswers,
  KnowledgeTestDocument,
  ProfessionalDossierDocument,
  SkillGap,
} from '../models';
import { EvaluationService } from './evaluation.service';
import { GapService } from './gap.service';
import { StepVerificationService } from './step-verification.service';
import { TrainingService } from './training.service';

/**
 * Non-régression du scoring d'évaluation.
 *
 * Le score est une note sur 100 : moyenne pondérée des critères, jamais la
 * somme brute des points (qui dépend du barème de chaque méthode).
 */
describe('EvaluationService — scoring', () => {
  let training: TrainingService;
  let evaluation: EvaluationService;
  let verification: StepVerificationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    training = TestBed.inject(TrainingService);
    evaluation = TestBed.inject(EvaluationService);
    verification = TestBed.inject(StepVerificationService);
  });

  /** Parcours complet, conditions de fin réellement remplies. */
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
    for (const unit of units) {
      /* Chaque unité passe par l'agent d'analyse des preuves : une unité
       * sans verdict favorable ne peut pas être terminée. */
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
      const outcome = training.completeUnit(request.id, unit.unitId, {
        minutes,
        checkpointPassed: true,
      });
      expect(outcome.ok).toBe(true);
    }
    training.submitCapstone(
      request.id,
      'Livrable complet, journal des décisions et preuves de vérification.',
    );
    const outcome = training.complete(request.id);
    expect(outcome.ok).toBe(true);
    return request.id;
  }

  function openKnowledgeTest(requestId: string): KnowledgeTestDocument {
    const opened = evaluation.open(requestId, 'KNOWLEDGE_TEST');
    expect(opened.ok).toBe(true);
    evaluation.start(requestId);
    return evaluation.forRequest(requestId)!.document as KnowledgeTestDocument;
  }

  function correctAnswers(document: KnowledgeTestDocument): EvaluationAnswers {
    const answers: EvaluationAnswers = {};
    for (const section of document.sections) {
      for (const question of section.questions) {
        if (question.type === 'OPEN' || question.type === 'TECHNICAL') {
          answers[question.id] = `${question.explanation} ${question.explanation} La démarche est justifiée par les observations, la preuve produite et les décisions documentées.`;
        } else {
          answers[question.id] = [...question.correctIndexes];
        }
      }
    }
    return answers;
  }

  function wrongAnswers(document: KnowledgeTestDocument): EvaluationAnswers {
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
    return answers;
  }

  it('normalise le score sur 100 quand toutes les réponses sont correctes', () => {
    const requestId = completedTraining();
    const document = openKnowledgeTest(requestId);

    const report = evaluation.submit(requestId, correctAnswers(document));

    expect(report).toBeTruthy();
    expect(report!.score).toBe(100);
    expect(report!.decision).toBe('REUSSI');
    expect(report!.criteria.every((criterion) => criterion.earned === criterion.max)).toBe(true);
  });

  it('attribue 0 quand toutes les réponses sont fausses', () => {
    const requestId = completedTraining();
    const document = openKnowledgeTest(requestId);

    const report = evaluation.submit(requestId, wrongAnswers(document));

    expect(report!.score).toBe(0);
    expect(report!.decision).toBe('ECHOUE');
  });

  it('corrige une situation comme un choix unique', () => {
    const requestId = completedTraining();
    const document = openKnowledgeTest(requestId);
    const answers = correctAnswers(document);

    const scenario = document.sections
      .flatMap((section) => section.questions)
      .find((question) => question.type === 'SCENARIO');
    expect(scenario).toBeTruthy();
    const extra = scenario!.options.findIndex(
      (_, index) => !scenario!.correctIndexes.includes(index),
    );
    answers[scenario!.id] = [...scenario!.correctIndexes, extra >= 0 ? extra : 0];

    const report = evaluation.submit(requestId, answers);
    const section = report!.criteria.find(
      (criterion) => criterion.id === document.sections.find((item) => item.questions.includes(scenario!))!.id,
    );

    expect(section!.earned).toBeLessThan(section!.max);
    expect(report!.score).toBeLessThan(100);
  });

  it('pondère le dossier professionnel 85/15 et ne compte que ces deux synthèses', () => {
    const requestId = completedTraining();
    const opened = evaluation.open(requestId, 'PROFESSIONAL_DOSSIER');
    expect(opened.ok).toBe(true);
    evaluation.start(requestId);
    const document = evaluation.forRequest(requestId)!.document as ProfessionalDossierDocument;

    const answers: EvaluationAnswers = {};
    for (const requirement of document.requirements) {
      answers[requirement.id] = `${requirement.description} ${requirement.label} : contexte, démarche, réalisation, contrôles, risques et limites documentés.`;
    }
    for (const question of document.defenseQuestions) {
      answers[question.id] = `${question.expectedThemes.join(', ')} : je défends ce choix, l'alternative écartée et la conséquence observée.`;
    }

    const report = evaluation.submit(requestId, answers);
    const dossier = report!.criteria.find((criterion) => criterion.id === 'dossier-global');
    const defense = report!.criteria.find((criterion) => criterion.id === 'dossier-defense');
    const details = report!.criteria.filter(
      (criterion) => criterion.id !== 'dossier-global' && criterion.id !== 'dossier-defense',
    );

    expect(dossier!.weight).toBe(85);
    expect(dossier!.max).toBe(85);
    expect(defense!.weight).toBe(15);
    expect(defense!.max).toBe(15);
    expect(details.every((criterion) => criterion.weight === 0)).toBe(true);
    expect(report!.criteria.reduce((sum, criterion) => sum + criterion.weight, 0)).toBe(100);
    expect(report!.score).toBe(100);
    expect(report!.decision).toBe('REUSSI');
  });
});
