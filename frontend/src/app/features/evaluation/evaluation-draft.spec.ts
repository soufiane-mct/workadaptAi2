import { TestBed } from '@angular/core/testing';
import {
  EvaluationAnswers,
  EvaluationRecord,
  KnowledgeTestDocument,
  SkillGap,
  TechnicalChallengeDocument,
} from '../../core/models';
import { EvaluationService } from '../../core/data/evaluation.service';
import { GapService } from '../../core/data/gap.service';
import { StepVerificationService } from '../../core/data/step-verification.service';
import { TrainingService } from '../../core/data/training.service';
import { KnowledgeTest } from './knowledge-test';
import { TechnicalChallenge } from './technical-challenge';

/**
 * Non-régression : les réponses d'une épreuve ne doivent jamais être perdues.
 *
 * Quitter l'épreuve (navigation, changement de page) puis y revenir doit
 * restituer le travail déjà fait. Le brouillon est distinct de
 * l'enregistrement de l'épreuve : modifier une réponse ne doit pas recréer
 * le composant à chaque frappe.
 */
describe('Évaluation — conservation des réponses', () => {
  let training: TrainingService;
  let evaluation: EvaluationService;
  let verification: StepVerificationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    training = TestBed.inject(TrainingService);
    evaluation = TestBed.inject(EvaluationService);
    verification = TestBed.inject(StepVerificationService);
  });

  /** Parcours terminé : condition préalable à toute évaluation. */
  function completedTraining(): string {
    const gap = TestBed.inject(GapService).gaps()[0] as SkillGap;
    const request = training.generateForGap({ gap, format: 'PRACTICAL' });
    training.approve(request.id, 'Curriculum vérifié.');
    training.start(request.id);

    const program = training.programFor(request.id)!;
    const progress = training.progressFor(request.id)!;
    const minutes = Math.ceil((program.estimatedHours * 60) / progress.units.length) + 15;

    for (const unit of progress.units) {
      verification.verify({
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
              detail: 'Sortie de commande observée et consignée dans l’environnement isolé.',
            },
          ],
          narrative:
            'Commandes réellement exécutées sur l’environnement isolé, résultat contrôlé et consigné.',
          durationMinutes: 30,
          expectedMinutes: 30,
        },
      });
      training.completeUnit(request.id, unit.unitId, { minutes, checkpointPassed: true });
    }
    training.submitCapstone(
      request.id,
      'Livrable complet, journal des décisions et preuves de vérification.',
    );
    expect(training.complete(request.id).ok).toBe(true);
    return request.id;
  }

  /** Ouvre une épreuve commencée et rend son enregistrement. */
  function openRecord(
    requestId: string,
    method: 'KNOWLEDGE_TEST' | 'TECHNICAL_CHALLENGE',
  ): EvaluationRecord {
    const opened = evaluation.open(requestId, method);
    expect(opened.ok).toBe(true);
    evaluation.start(requestId);
    return evaluation.forRequest(requestId)!;
  }

  it('conserve le brouillon dans le service, par évaluation', () => {
    const requestId = completedTraining();
    const record = openRecord(requestId, 'KNOWLEDGE_TEST');
    const answers: EvaluationAnswers = { 'q-1': 'Réponse conservée' };

    evaluation.saveDraft(record.id, answers);

    expect(evaluation.draft(record.id)['q-1']).toBe('Réponse conservée');
    // Un autre brouillon n'est pas pollué.
    expect(evaluation.draft('eval-inconnue')).toEqual({});
  });

  it('réhydrate les réponses du test de connaissances', () => {
    const requestId = completedTraining();
    const record = openRecord(requestId, 'KNOWLEDGE_TEST');
    const questions = (record.document as KnowledgeTestDocument).sections.flatMap(
      (section) => section.questions,
    );
    const open = questions.find((question) => question.type === 'OPEN' || question.type === 'TECHNICAL')!;
    const choice = questions.find(
      (question) => question.type !== 'OPEN' && question.type !== 'TECHNICAL',
    )!;

    const fixture = TestBed.createComponent(KnowledgeTest);
    fixture.componentRef.setInput('record', record);
    fixture.componentRef.setInput('draft', {
      [open.id]: 'Réponse déjà rédigée, suffisamment développée pour être comptée.',
      [choice.id]: [0],
    });
    fixture.detectChanges();
    const component = fixture.componentInstance;

    expect(component.text(open.id)).toContain('déjà rédigée');
    expect(component.isPicked(choice, 0)).toBe(true);
    expect(component.answeredCount()).toBe(2);
  });

  it('émet les réponses courantes à chaque modification', () => {
    const requestId = completedTraining();
    const record = openRecord(requestId, 'KNOWLEDGE_TEST');
    const questions = (record.document as KnowledgeTestDocument).sections.flatMap(
      (section) => section.questions,
    );
    const open = questions.find((question) => question.type === 'OPEN' || question.type === 'TECHNICAL')!;

    const fixture = TestBed.createComponent(KnowledgeTest);
    fixture.componentRef.setInput('record', record);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    const emitted: EvaluationAnswers[] = [];
    component.changed.subscribe((answers) => emitted.push(answers));

    component.setText(open.id, 'Réponse en cours de saisie');

    expect(emitted).toHaveLength(1);
    expect(emitted[0][open.id]).toBe('Réponse en cours de saisie');
  });

  it('réhydrate les critères, la note et l’indice de l’épreuve technique', () => {
    const requestId = completedTraining();
    const record = openRecord(requestId, 'TECHNICAL_CHALLENGE');
    const tasks = (record.document as TechnicalChallengeDocument).tasks;
    const draft: EvaluationAnswers = {
      [tasks[0].id]: [0, 1],
      [`${tasks[0].id}::note`]: 'Image multi-étapes, healthcheck OK.',
      [`${tasks[0].id}::hint`]: 1,
      [`${tasks[0].id}::log`]: '$ vérif --tache ' + tasks[0].id,
    };

    const fixture = TestBed.createComponent(TechnicalChallenge);
    fixture.componentRef.setInput('record', record);
    fixture.componentRef.setInput('draft', draft);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    expect(component.checkedFor(tasks[0].id)).toEqual([0, 1]);
    expect(component.noteFor(tasks[0].id)).toBe('Image multi-étapes, healthcheck OK.');
    expect(component.hintFor(tasks[0].id).length).toBeGreaterThan(0);
    expect(component.linesFor(tasks[0].id)).toHaveLength(1);
  });

  it('remet les mêmes réponses qu’il a conservées', () => {
    const requestId = completedTraining();
    const record = openRecord(requestId, 'TECHNICAL_CHALLENGE');
    const tasks = (record.document as TechnicalChallengeDocument).tasks;

    const fixture = TestBed.createComponent(TechnicalChallenge);
    fixture.componentRef.setInput('record', record);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component.toggleCriterion(tasks[0].id, 0);
    component.setNote(tasks[0].id, 'Note de contrôle');

    const emitted: EvaluationAnswers[] = [];
    component.changed.subscribe((answers) => emitted.push(answers));
    component.runCheck(tasks[0]);

    expect(emitted).toHaveLength(1);
    expect(emitted[0][tasks[0].id]).toEqual([0]);
    expect(emitted[0][`${tasks[0].id}::note`]).toBe('Note de contrôle');
    expect(String(emitted[0][`${tasks[0].id}::log`])).toContain('vérif');
  });
});
