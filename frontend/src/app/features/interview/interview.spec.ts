import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { DataService } from '../../core/data/data.service';
import { Interview } from './interview';

describe('Entretien IA diagnostique (rendu)', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideNoopAnimations()],
    });
  });

  function create() {
    const fixture = TestBed.createComponent(Interview);
    fixture.detectChanges();
    return fixture;
  }

  it('démarre sur l’analyse du CV avec les cinq temps annoncés', () => {
    const fixture = create();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelectorAll('.stepper__item')).toHaveLength(5);
    expect(element.textContent).toContain('Analyse du CV');
    expect(element.textContent).toContain('Commencer la conversation');
    expect(element.textContent).toContain('Observation ou inférence ?');
  });

  it('affiche la conversation puis le quiz diagnostique', () => {
    const fixture = create();
    const component = fixture.componentInstance;

    component.startConversation();
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelectorAll('.msg').length).toBeGreaterThanOrEqual(2);
    expect(component.messages().length).toBeGreaterThan(0);

    component.goToQuiz();
    fixture.detectChanges();

    expect(element.querySelectorAll('.question')).toHaveLength(4);
    expect(element.textContent).toContain('Quiz diagnostique');
  });

  it('calcule le score du quiz et expose les points forts', () => {
    const fixture = create();
    const component = fixture.componentInstance;

    component.goToQuiz();
    for (const question of component.diagnosticQuiz) {
      component.answerQuiz(question.id, question.correctIndex);
    }
    expect(component.quizAnswered()).toBe(true);

    component.submitQuiz();
    fixture.detectChanges();

    expect(component.quizScore()).toBe(100);
    expect(component.strengths()).toHaveLength(4);
    expect(component.watchpoints()).toHaveLength(0);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Score quiz : 100 / 100');
  });

  it('enregistre le diagnostic et propose trois actions concrètes', () => {
    const fixture = create();
    const component = fixture.componentInstance;
    const data = TestBed.inject(DataService);

    component.goToQuiz();
    for (const question of component.diagnosticQuiz) {
      component.answerQuiz(question.id, question.correctIndex);
    }
    component.submitQuiz();

    component.goToScenario();
    component.chooseScenario(0);
    component.scenarioDraft.set(
      'Je consulte les logs précédents et les events du pod pour isoler la cause, je corrige la configuration puis je vérifie le redémarrage et les tests de santé avant de redéployer.',
    );
    expect(component.canSubmitScenario()).toBe(true);

    component.submitScenario();
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(component.phase()).toBe('SYNTHESIS');
    expect(data.interviewDiagnostic()).not.toBeNull();
    expect(data.interviewDiagnostic()!.actions).toHaveLength(3);
    expect(element.querySelectorAll('.action')).toHaveLength(3);
    expect(element.textContent).toContain('Trois actions concrètes pour la suite');
    expect(element.textContent).toContain('Aucun résultat n’est utilisé de manière disciplinaire');
  });
});
