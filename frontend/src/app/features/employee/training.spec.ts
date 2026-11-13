import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { DataService } from '../../core/data/data.service';
import { EmployeeAssessment } from './assessment';
import { EmployeeCourses } from './courses';
import { EmployeeFormats } from './formats';

describe('Écrans de formation (rendu)', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideNoopAnimations()],
    });
  });

  it('affiche les sept fiches de format', () => {
    const fixture = TestBed.createComponent(EmployeeFormats);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelectorAll('.format')).toHaveLength(7);
    expect(element.textContent).toContain('Comment se déroule cette formation ?');
    expect(element.textContent).toContain('Rôle de l’IA');
  });

  it('affiche le tableau du parcours et le processus post-formation', () => {
    const fixture = TestBed.createComponent(EmployeeCourses);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelectorAll('.steps-table tbody tr').length).toBeGreaterThan(0);
    expect(element.querySelectorAll('.pipeline__step')).toHaveLength(6);
    expect(element.textContent).toContain('Activité de l’employé');
  });

  it('affiche les huit questions et les six étapes d’évaluation', () => {
    const fixture = TestBed.createComponent(EmployeeAssessment);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelectorAll('.question')).toHaveLength(8);
    expect(element.querySelectorAll('.stepper__item')).toHaveLength(6);
    expect(element.textContent).toContain('Soumettre le quiz');
  });

  it('affiche le feedback après soumission du quiz et de la pratique', () => {
    const data = TestBed.inject(DataService);

    for (const question of data.assessment().quiz) {
      data.answerQuestion(question.id, question.correctIndex);
    }
    data.submitQuiz();
    data.submitPractical('Dockerfile et commandes de build soumis pour vérification.');
    data.goToAssessmentStage('FEEDBACK');

    const fixture = TestBed.createComponent(EmployeeAssessment);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('Correction et feedback avec l’IA');
    expect(element.querySelectorAll('.feedback-block')).toHaveLength(2);
  });
});
