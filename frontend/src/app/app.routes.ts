import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { roleGuard } from './core/auth/role.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'app' },
  {
    path: 'login',
    title: 'Connexion — WorkAdapt AI',
    loadComponent: () => import('./features/auth/login').then((m) => m.Login),
  },
  {
    path: 'app',
    canActivate: [authGuard],
    loadComponent: () => import('./shared/layout/shell').then((m) => m.Shell),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'tableau-de-bord' },
      {
        path: 'acces-refuse',
        title: 'Accès refusé — WorkAdapt AI',
        loadComponent: () =>
          import('./features/auth/access-denied').then((m) => m.AccessDenied),
      },
      {
        path: 'tableau-de-bord',
        title: 'Tableau de bord — WorkAdapt AI',
        loadComponent: () =>
          import('./features/dashboard/dashboard').then((m) => m.DashboardDispatcher),
      },
      {
        path: 'notifications',
        title: 'Notifications — WorkAdapt AI',
        loadComponent: () =>
          import('./features/notifications/notifications').then((m) => m.NotificationsPage),
      },
      {
        path: 'profil',
        title: 'Mon profil — WorkAdapt AI',
        loadComponent: () =>
          import('./features/employee/profile').then((m) => m.EmployeeProfile),
      },
      {
        path: 'competences',
        title: 'Mes compétences — WorkAdapt AI',
        loadComponent: () =>
          import('./features/employee/skills').then((m) => m.EmployeeSkills),
      },
      {
        path: 'parcours/:courseId/evaluation',
        title: 'Évaluation finale — WorkAdapt AI',
        loadComponent: () =>
          import('./features/employee/assessment').then((m) => m.EmployeeAssessment),
      },
      {
        path: 'parcours',
        title: 'Mon parcours — WorkAdapt AI',
        loadComponent: () =>
          import('./features/employee/courses').then((m) => m.EmployeeCourses),
      },
      {
        path: 'formations/:requestId',
        title: 'Formation en cours — WorkAdapt AI',
        loadComponent: () =>
          import('./features/employee/training-session').then((m) => m.TrainingSession),
      },
      {
        path: 'formations',
        title: 'Formats de formation — WorkAdapt AI',
        loadComponent: () =>
          import('./features/employee/formats').then((m) => m.EmployeeFormats),
      },
      {
        path: 'certificats',
        title: 'Mes certificats — WorkAdapt AI',
        loadComponent: () =>
          import('./features/employee/certificates').then((m) => m.EmployeeCertificates),
      },
      {
        path: 'entretien',
        title: 'Entretien IA — WorkAdapt AI',
        loadComponent: () =>
          import('./features/interview/interview').then((m) => m.Interview),
      },
      {
        path: 'validations',
        title: 'Validations — WorkAdapt AI',
        canActivate: [roleGuard(['MANAGER', 'ADMIN'])],
        loadComponent: () =>
          import('./features/supervisor/approvals').then((m) => m.SupervisorApprovals),
      },
      {
        path: 'equipe',
        title: 'Mon équipe — WorkAdapt AI',
        canActivate: [roleGuard(['MANAGER', 'ADMIN'])],
        loadComponent: () => import('./features/supervisor/team').then((m) => m.SupervisorTeam),
      },
      {
        path: 'suivi-formations',
        title: 'Suivi des formations — WorkAdapt AI',
        canActivate: [roleGuard(['MANAGER', 'ADMIN'])],
        loadComponent: () =>
          import('./features/supervisor/training-followup').then((m) => m.TrainingFollowUp),
      },
      {
        path: 'resultats',
        title: 'Résultats et évaluations — WorkAdapt AI',
        canActivate: [roleGuard(['MANAGER', 'ADMIN'])],
        loadComponent: () =>
          import('./features/supervisor/results').then((m) => m.SupervisorResults),
      },
      {
        path: 'rh',
        title: 'Vue RH — WorkAdapt AI',
        canActivate: [roleGuard(['RH', 'ADMIN'])],
        loadComponent: () => import('./features/hr/overview').then((m) => m.HrOverview),
      },
      {
        path: 'besoins-formation',
        title: 'Besoins de formation — WorkAdapt AI',
        canActivate: [roleGuard(['RH', 'ADMIN'])],
        loadComponent: () => import('./features/hr/training-needs').then((m) => m.HrTrainingNeeds),
      },
      {
        path: 'tendances',
        title: 'Tendances des compétences — WorkAdapt AI',
        canActivate: [roleGuard(['RH', 'ADMIN'])],
        loadComponent: () => import('./features/hr/trends').then((m) => m.HrTrends),
      },
      {
        path: 'formations-certifications',
        title: 'Formations et certifications — WorkAdapt AI',
        canActivate: [roleGuard(['RH', 'ADMIN'])],
        loadComponent: () =>
          import('./features/hr/certifications').then((m) => m.HrCertifications),
      },
      {
        path: 'rapports',
        title: 'Rapports et exports — WorkAdapt AI',
        canActivate: [roleGuard(['RH', 'ADMIN'])],
        loadComponent: () => import('./features/hr/reports').then((m) => m.HrReports),
      },
      {
        path: 'utilisateurs',
        title: 'Utilisateurs — WorkAdapt AI',
        canActivate: [roleGuard(['ADMIN'])],
        loadComponent: () => import('./features/hr/users').then((m) => m.HrUsers),
      },
      {
        path: 'audit',
        title: "Journal d'audit — WorkAdapt AI",
        canActivate: [roleGuard(['ADMIN'])],
        loadComponent: () => import('./features/hr/audit').then((m) => m.AuditLog),
      },
      {
        path: 'agents',
        title: 'AI Agent Control Center — WorkAdapt AI',
        canActivate: [roleGuard(['ADMIN'])],
        loadComponent: () =>
          import('./features/control-center/agents').then((m) => m.AgentControlCenter),
      },
    ],
  },
  { path: '**', redirectTo: 'app' },
];
