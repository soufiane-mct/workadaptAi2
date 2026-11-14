import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
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
    expect(element.textContent).toContain('Déroulement');
    expect(element.textContent).toContain('Rôle de l’IA');
  });

  it('propose un écart, un seul format et un sujet avant la demande', () => {
    const fixture = TestBed.createComponent(EmployeeFormats);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelectorAll('.gap').length).toBeGreaterThan(0);
    expect(element.querySelectorAll('.pick')).toHaveLength(7);
    expect(element.textContent).toContain('Générer ma formation');
    expect(element.textContent).toContain('superviseur');
  });

  it('affiche le tableau du parcours et le processus post-formation', () => {
    const fixture = TestBed.createComponent(EmployeeCourses);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelectorAll('.steps-table tbody tr').length).toBeGreaterThan(0);
    expect(element.querySelectorAll('.pipeline__step')).toHaveLength(6);
    expect(element.textContent).toContain('Activité de l’employé');
  });

  it('propose les sept formats d’évaluation avant de générer les activités', () => {
    const fixture = TestBed.createComponent(EmployeeAssessment);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelectorAll('.choice')).toHaveLength(7);
    expect(element.textContent).toContain('Choisissez le format de votre évaluation');
    expect(element.querySelectorAll('.question')).toHaveLength(0);
  });

  it('génère les activités du format choisi à partir du parcours terminé', () => {
    const fixture = TestBed.createComponent(EmployeeAssessment);
    fixture.detectChanges();

    fixture.componentInstance.chooseFormat('INTERACTIVE');
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(fixture.componentInstance.tasks().length).toBeGreaterThan(0);
    expect(element.querySelectorAll('.task').length).toBeGreaterThan(0);
    expect(element.textContent).toContain('Changer de format');
    expect(element.textContent).toContain('Seuil 75 / 100');
  });
});
