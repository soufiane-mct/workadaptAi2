import { TestBed } from '@angular/core/testing';
import { AuthService } from '../auth/auth.service';
import { DEMO_ACCOUNTS } from './mock-data';
import { DataService } from './data.service';
import { DemoStateStore } from './demo-state.store';
import { GapService } from './gap.service';
import { ProfileService } from './profile.service';

/**
 * Non-régression de l'isolation des espaces collaborateur.
 *
 * Deux comptes peuvent vivre dans le même navigateur : aucune lecture, aucune
 * action et aucune persistance ne doit franchir la frontière d'un employeeId.
 */
describe('Isolation des espaces collaborateur', () => {
  let auth: AuthService;
  let data: DataService;
  let profile: ProfileService;
  let gaps: GapService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    auth = TestBed.inject(AuthService);
    data = TestBed.inject(DataService);
    profile = TestBed.inject(ProfileService);
    gaps = TestBed.inject(GapService);
  });

  function registerEmployee(): ReturnType<AuthService['register']> {
    return auth.register({
      firstName: 'Nora',
      lastName: 'Martin',
      email: 'nora.martin@exemple.test',
      jobTitle: 'Analyste',
      department: 'Opérations',
    });
  }

  it('n’expose ni les données ni les actions d’un autre collaborateur', () => {
    auth.login('EMPLOYEE');
    const demoRequest = data.myRequests()[0];
    const demoCertificate = data.myCertificates()[0];
    expect(demoRequest).toBeDefined();
    expect(demoCertificate).toBeDefined();

    const registered = registerEmployee();

    expect(profile.employeeId()).toBe(registered.employeeId);
    expect(data.myRequests()).toEqual([]);
    expect(data.myCertificates()).toEqual([]);
    expect(data.myRequestById(demoRequest!.id)).toBeUndefined();
    expect(data.myCertificateById(demoCertificate!.id)).toBeUndefined();
    expect(data.myEvaluationFor(demoRequest!.id)).toBeUndefined();

    const requestBefore = data.trainingService.requestById(demoRequest!.id)!.status;
    data.startTraining(demoRequest!.id);
    data.completeTrainingUnit(demoRequest!.id, 'unité-indisponible');
    expect(data.trainingService.requestById(demoRequest!.id)!.status).toBe(requestBefore);
  });

  it('maintient des profils distincts après changement de session', () => {
    const registered = registerEmployee();
    profile.updateProfile({
      tools: ['Outil du compte isolé'],
      objectives: ['Objectif strictement personnel'],
    });

    expect(profile.profile().tools).toEqual(['Outil du compte isolé']);
    expect(profile.profile().employeeId).toBe(registered.employeeId);

    const demoAccount = DEMO_ACCOUNTS.find((account) => account.role === 'EMPLOYEE')!;
    auth.loginById(demoAccount.id);

    expect(profile.profile().employeeId).toBe('emp-0001');
    expect(profile.profile().tools).not.toContain('Outil du compte isolé');
  });

  it('restaure le compte, son profil et son parcours après un rechargement', () => {
    const registered = registerEmployee();
    profile.updateProfile({
      tools: ['Outil persistant'],
      objectives: ['Objectif restauré'],
    });

    const gap = gaps.createFromSignal({
      employeeId: registered.employeeId!,
      skillCode: 'PERSISTANCE',
      skillLabel: 'Compétence persistante',
      currentLevel: 30,
      targetLevel: 80,
      confidence: 0.8,
      inference: 'Écart créé dans le test de persistance.',
      evidence: {
        id: 'ev-persistence',
        at: new Date().toISOString(),
        source: 'INTERVIEW',
        statement: 'Compétence déclarée pour le test de persistance.',
        observed: false,
        confidence: 0.8,
      },
    });
    const request = data.generateTrainingForGap(gap.id, 'MULTIMEDIA');
    expect(request).toBeDefined();

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});

    const restoredAuth = TestBed.inject(AuthService);
    const restoredData = TestBed.inject(DataService);
    const restoredProfile = TestBed.inject(ProfileService);

    expect(restoredAuth.user()?.id).toBe(registered.id);
    expect(restoredAuth.user()?.employeeId).toBe(registered.employeeId);
    expect(restoredProfile.profile().tools).toEqual(['Outil persistant']);
    expect(restoredData.myRequestById(request!.id)).toBeDefined();
    expect(restoredData.myRequestById(request!.id)?.employeeId).toBe(registered.employeeId);
  });

  it('efface uniquement l’espace du collaborateur ciblé', () => {
    auth.login('EMPLOYEE');
    const demoRequest = data.myRequests()[0];
    const registered = registerEmployee();
    profile.updateProfile({ tools: ['À effacer'] });

    data.resetEmployeeWorkspace(registered.employeeId!);

    expect(profile.profiles()[registered.employeeId!]).toBeUndefined();
    auth.loginById(DEMO_ACCOUNTS.find((account) => account.role === 'EMPLOYEE')!.id);
    expect(data.myRequestById(demoRequest!.id)).toBeDefined();
  });

  it('réinitialise l’état de démonstration sans supprimer les comptes locaux', () => {
    const registered = registerEmployee();
    profile.updateProfile({ tools: ['Avant réinitialisation'] });
    const store = TestBed.inject(DemoStateStore);

    data.resetDemo();

    expect(auth.registeredAccounts().some((account) => account.id === registered.id)).toBe(true);
    expect(store.data()['profile.profiles']).toBeUndefined();
    expect(profile.profile().employeeId).toBe(registered.employeeId);
  });

  it('respecte le consentement de chaque collaborateur dans les vues gestionnaire', () => {
    auth.login('EMPLOYEE');
    expect(data.followUps().some((item) => item.employeeId === 'emp-0001')).toBe(true);

    const current = profile.profile().consent;
    profile.updateProfile({
      consent: { ...current, shareWithSupervisor: false, at: new Date().toISOString() },
    });
    expect(data.followUps().some((item) => item.employeeId === 'emp-0001')).toBe(false);

    auth.login('MANAGER');
    expect(data.followUps().some((item) => item.employeeId === 'emp-0001')).toBe(false);
    expect(
      data.supervisorReports().some(
        (item) => data.requestById(item.requestId)?.employeeId === 'emp-0001',
      ),
    ).toBe(false);
    expect(
      data.supervisorCertificates().some((item) => item.employeeId === 'emp-0001'),
    ).toBe(false);
  });
});
