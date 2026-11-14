import { TestBed } from '@angular/core/testing';
import { DataService } from './data.service';

describe('Parcours de formation validé par un humain', () => {
  let service: DataService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DataService);
  });

  function createRequest(format: 'MULTIMEDIA' | 'INTERACTIVE' | 'PRACTICAL' = 'PRACTICAL') {
    const gap = service.skillGaps()[0];
    return service.createTrainingRequest({
      employeeId: 'emp-0001',
      employeeName: 'Soufiane Mechta',
      gap,
      format,
      subject: 'Docker en production',
      objective: 'Construire et diagnostiquer une image Docker en équipe.',
    });
  }

  it('crée une demande en attente et notifie l’employé puis le superviseur', () => {
    const request = createRequest();

    expect(request.status).toBe('PENDING');
    expect(service.trainingRequests().some((item) => item.id === request.id)).toBe(true);

    const employeeNotifications = service.notificationsFor('EMPLOYEE');
    const managerNotifications = service.notificationsFor('MANAGER');
    expect(employeeNotifications.some((item) => item.type === 'TRAINING_SUBMITTED')).toBe(true);
    expect(managerNotifications.some((item) => item.type === 'TRAINING_SUBMITTED')).toBe(true);
  });

  it('génère la formation du format choisi seulement après approbation', () => {
    const request = createRequest('INTERACTIVE');
    expect(service.trainingFor(request.id)).toBeNull();

    service.decideTrainingRequest(request.id, 'APPROVED', 'Validé pour l’équipe.');

    const updated = service.trainingRequests().find((item) => item.id === request.id)!;
    expect(updated.status).toBe('APPROVED');
    expect(updated.supervisorNote).toBe('Validé pour l’équipe.');

    const training = service.trainingFor(request.id);
    expect(training).not.toBeNull();
    expect(training!.format).toBe('INTERACTIVE');
    expect(training!.steps.length).toBeGreaterThan(0);

    const notifications = service.notificationsFor('EMPLOYEE');
    expect(notifications.some((item) => item.type === 'TRAINING_APPROVED')).toBe(true);
  });

  it('ne génère aucun contenu quand la demande est rejetée', () => {
    const request = createRequest();
    service.decideTrainingRequest(request.id, 'REJECTED', 'Périmètre à préciser.');

    const updated = service.trainingRequests().find((item) => item.id === request.id)!;
    expect(updated.status).toBe('REJECTED');
    expect(service.trainingFor(request.id)).toBeNull();

    const notifications = service.notificationsFor('EMPLOYEE');
    expect(notifications.some((item) => item.type === 'TRAINING_REJECTED')).toBe(true);
  });

  it('suit le cycle IN_PROGRESS puis COMPLETED et met à jour la compétence', () => {
    const request = createRequest();
    service.decideTrainingRequest(request.id, 'APPROVED');
    service.startTraining(request.id);
    expect(
      service.trainingRequests().find((item) => item.id === request.id)!.status,
    ).toBe('IN_PROGRESS');

    const before = service.skills().find((skill) => skill.code === request.skillCode)!.level;
    service.completeTraining(request.id);

    expect(
      service.trainingRequests().find((item) => item.id === request.id)!.status,
    ).toBe('COMPLETED');
    const after = service.skills().find((skill) => skill.code === request.skillCode)!.level;
    expect(after).toBeGreaterThan(before);

    const notifications = service.notificationsFor('EMPLOYEE');
    expect(notifications.some((item) => item.type === 'TRAINING_COMPLETED')).toBe(true);
  });

  it('enregistre une évaluation échouée sans délivrer de certificat', () => {
    const evaluation = service.prepareEvaluation('PRACTICAL');
    const beforeCertificates = service.certificates().length;
    const beforeResults = service.evaluationResults().length;

    const certificate = service.completeEvaluation({
      score: 52,
      format: 'PRACTICAL',
      employeeId: 'emp-0001',
      employeeName: 'Soufiane Mechta',
      criteria: ['Exercice partiellement réussi'],
    });

    expect(certificate).toBeNull();
    expect(service.certificates()).toHaveLength(beforeCertificates);

    const [result] = service.evaluationResults();
    expect(service.evaluationResults()).toHaveLength(beforeResults + 1);
    expect(result.passed).toBe(false);
    expect(result.certificateId).toBeUndefined();
    expect(result.courseTitle).toBe(evaluation.courseTitle);
  });

  it('délivre un certificat interne au-dessus du seuil de 75', () => {
    const evaluation = service.prepareEvaluation('SIMULATION');
    const before = service.certificates().length;

    const certificate = service.completeEvaluation({
      score: 82,
      format: 'SIMULATION',
      employeeId: 'emp-0001',
      employeeName: 'Soufiane Mechta',
      criteria: ['Mise en situation réussie'],
    });

    expect(certificate).not.toBeNull();
    expect(service.certificates()).toHaveLength(before + 1);
    expect(service.evaluationResults()[0].passed).toBe(true);
    expect(service.evaluationResults()[0].evaluationFormat).toBe('SIMULATION');
    expect(evaluation.passScore).toBe(75);
  });

  it('enregistre l’entretien diagnostique et ses trois actions', () => {
    const result = service.recordInterviewDiagnostic({
      quizScore: 75,
      scenarioScore: 80,
      globalScore: 77,
      strengths: ['Diagnostic Docker'],
      watchpoints: ['Secrets CI/CD'],
      actions: [
        {
          title: 'Consolider les secrets',
          description: 'Une formation ciblée sur les secrets de pipeline.',
          link: '/app/formations',
          action: 'Choisir une formation',
          tone: 'warning',
        },
        {
          title: 'Projet pratique',
          description: 'Un projet pour consolider la pratique.',
          link: '/app/formations',
          action: 'Choisir un projet',
          tone: 'success',
        },
        {
          title: 'Mettre à jour mes compétences',
          description: 'Les réponses alimentent le profil.',
          link: '/app/competences',
          action: 'Voir mes compétences',
          tone: 'success',
        },
      ],
    });

    expect(service.interviewDiagnostic()).toEqual(result);
    expect(result.actions).toHaveLength(3);
    expect(result.id.startsWith('diag-')).toBe(true);

    const notifications = service.notificationsFor('EMPLOYEE');
    expect(notifications.some((item) => item.message.includes('77 / 100'))).toBe(true);
  });

  it('filtre les notifications par rôle et gère la lecture', () => {
    const managerCount = service.notificationsFor('MANAGER').length;
    expect(managerCount).toBeGreaterThan(0);

    const first = service.notificationsFor('MANAGER')[0];
    service.markNotificationRead(first.id);
    expect(service.notificationsFor('MANAGER').find((item) => item.id === first.id)!.read).toBe(true);

    service.markAllNotificationsRead('MANAGER');
    expect(service.notificationsFor('MANAGER').every((item) => item.read)).toBe(true);
  });
});
