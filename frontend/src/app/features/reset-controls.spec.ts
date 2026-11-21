import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { AuthService } from '../core/auth/auth.service';
import { DataService } from '../core/data/data.service';
import { AdminPage } from './admin/admin';
import { ProfilePage } from './employee/profile';

/**
 * Non-régression des contrôles de réinitialisation.
 *
 * Une action destructive doit toujours demander une confirmation. Une annulation
 * ne modifie aucune donnée ; une confirmation applique exactement le périmètre
 * annoncé par l'interface.
 */
describe('Contrôles de réinitialisation', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exige une confirmation avant la réinitialisation globale', () => {
    TestBed.configureTestingModule({
      imports: [AdminPage],
      providers: [provideRouter([])],
    });
    const auth = TestBed.inject(AuthService);
    const data = TestBed.inject(DataService);
    const fixture = TestBed.createComponent(AdminPage);
    const component = fixture.componentInstance;
    const resetSpy = vi.spyOn(data, 'resetDemo');
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    auth.login('ADMIN');

    component.resetDemo();

    expect(confirmSpy).toHaveBeenCalledOnce();
    expect(resetSpy).not.toHaveBeenCalled();
    expect(component.message()).toContain('annulée');
  });

  it('rétablit les données de démonstration après confirmation', () => {
    TestBed.configureTestingModule({
      imports: [AdminPage],
      providers: [provideRouter([])],
    });
    const auth = TestBed.inject(AuthService);
    const data = TestBed.inject(DataService);
    const fixture = TestBed.createComponent(AdminPage);
    const component = fixture.componentInstance;
    const resetSpy = vi.spyOn(data, 'resetDemo');
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    auth.login('ADMIN');

    component.resetDemo();

    expect(resetSpy).toHaveBeenCalledOnce();
    expect(component.message()).toContain('rétablies');
  });

  it('conserve l’espace du collaborateur lorsque l’effacement est annulé', () => {
    TestBed.configureTestingModule({
      imports: [ProfilePage],
      providers: [provideRouter([])],
    });
    const auth = TestBed.inject(AuthService);
    const data = TestBed.inject(DataService);
    const fixture = TestBed.createComponent(ProfilePage);
    const component = fixture.componentInstance;
    const resetSpy = vi.spyOn(data, 'resetEmployeeWorkspace');
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    auth.login('EMPLOYEE');

    component.eraseWorkspace();

    expect(confirmSpy).toHaveBeenCalledOnce();
    expect(resetSpy).not.toHaveBeenCalled();
    expect(component.message()).toContain('annulé');
  });

  it('efface uniquement l’espace du collaborateur après confirmation', () => {
    TestBed.configureTestingModule({
      imports: [ProfilePage],
      providers: [provideRouter([])],
    });
    const auth = TestBed.inject(AuthService);
    const data = TestBed.inject(DataService);
    const fixture = TestBed.createComponent(ProfilePage);
    const component = fixture.componentInstance;
    const resetSpy = vi.spyOn(data, 'resetEmployeeWorkspace');
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    auth.login('EMPLOYEE');

    component.eraseWorkspace();

    expect(resetSpy).toHaveBeenCalledOnce();
    expect(component.message()).toContain('effacé');
    expect(data.myRequests()).toEqual([]);
    expect(data.myCertificates()).toEqual([]);
  });
});
