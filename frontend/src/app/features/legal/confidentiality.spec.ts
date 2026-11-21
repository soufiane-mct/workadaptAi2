import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AuthService } from '../../core/auth/auth.service';
import { ConfidentialityPage } from './confidentiality';

/**
 * Non-régression de la copie de confidentialité.
 *
 * Le journal d'audit contient des acteurs et des cibles nominatives : sa
 * visibilité doit rester réservée à l'administrateur, y compris dans la
 * table présentée aux utilisateurs. La RH ne doit jamais y lire une entrée.
 */
describe('Confidentialité — visibilité du journal d’audit', () => {
  let fixture: ComponentFixture<ConfidentialityPage>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ConfidentialityPage] });
    TestBed.inject(AuthService).login('EMPLOYEE');
    fixture = TestBed.createComponent(ConfidentialityPage);
    fixture.detectChanges();
  });

  it('réserve la lecture du journal d’audit à l’administrateur', () => {
    const root = fixture.nativeElement as HTMLElement;
    const row = Array.from(root.querySelectorAll<HTMLElement>('tbody tr')).find((candidate) =>
      (candidate.textContent ?? '').includes('Journal d’audit'),
    );

    expect(row).toBeDefined();
    const cells = Array.from(row!.querySelectorAll<HTMLElement>('td')).map((cell) =>
      (cell.textContent ?? '').trim(),
    );

    // Donnée, Employé, Superviseur, RH, Administrateur.
    expect(cells).toHaveLength(5);
    expect(cells[2]).toBe('Non');
    expect(cells[3]).toBe('Non');
    expect(cells[4]).toBe('Lecture');
  });
});
