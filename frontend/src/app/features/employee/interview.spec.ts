import { TestBed } from '@angular/core/testing';
import { InterviewPage } from './interview';

/**
 * Non-régression : l'entretien IA ne doit jamais rester bloqué.
 *
 * - une relance ne bloque pas la question ;
 * - après deux relances, la réponse est retenue telle quelle ;
 * - le bouton « Passer cette question » ne peut pas faire sauter un thème ;
 * - l'entretien se termine même si toutes les questions sont passées.
 */
describe('Entretien IA — jamais bloqué', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  function page(): InterviewPage {
    return TestBed.runInInjectionContext(() => new InterviewPage());
  }

  function waitForAgent(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 700));
  }

  const CONCRETE =
    'J’ai exécuté docker puis le pipeline de livraison, avec revue par les pairs et tests automatisés.';
  const VAGUE = 'Je fais mon travail au quotidien avec les outils de l’équipe.';

  it('enregistre une réponse exploitable et passe au thème suivant', async () => {
    const interview = page();
    interview.draft.set(CONCRETE);
    interview.send();
    await waitForAgent();

    expect(interview.index()).toBe(1);
    expect(Object.keys(interview.answers())).toEqual(['daily']);
    expect(interview.statuses()['daily']).toBe('VALIDE');
  });

  it('relance sans bloquer et n’enregistre pas une réponse trop vague', async () => {
    const interview = page();
    interview.draft.set(VAGUE);
    interview.send();
    await waitForAgent();

    expect(interview.index()).toBe(0);
    expect(interview.statuses()['daily']).toBe('RELANCE');
    expect(Object.keys(interview.answers())).toHaveLength(0);
  });

  it('retient la réponse après deux relances au lieu de rester bloqué', async () => {
    const interview = page();
    for (let attempt = 0; attempt < 3; attempt += 1) {
      interview.draft.set(VAGUE);
      interview.send();
      await waitForAgent();
    }

    expect(interview.index()).toBe(1);
    expect(interview.statuses()['daily']).toBe('VALIDE');
    expect(Object.keys(interview.answers())).toHaveLength(1);
  });

  it('ne fait sauter aucun thème quand l’employé passe la question pendant l’analyse', async () => {
    const interview = page();
    interview.draft.set(CONCRETE);
    interview.send();
    interview.skip();
    await waitForAgent();

    expect(interview.index()).toBe(1);
    expect(interview.statuses()['daily']).toBe('PASSEE');
    expect(Object.keys(interview.answers())).toHaveLength(0);
  });

  it('termine l’entretien et produit un diagnostic même si tout est passé', () => {
    const interview = page();
    for (let index = 0; index < interview.script.length; index += 1) {
      interview.skip();
    }

    expect(interview.finished()).toBe(true);
    expect(interview.result()).toBeTruthy();
    expect(interview.result()!.globalScore).toBeGreaterThanOrEqual(0);
  });
});
