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
    path: 'register',
    title: 'Créer un profil — WorkAdapt AI',
    data: { mode: 'register' },
    loadComponent: () => import('./features/employee/onboarding').then((m) => m.Onboarding),
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
        path: 'onboarding',
        canActivate: [roleGuard(['EMPLOYEE'])],
        title: 'Profil professionnel — WorkAdapt AI',
        loadComponent: () =>
          import('./features/employee/onboarding').then((m) => m.Onboarding),
      },
      {
        path: 'collecte',
        canActivate: [roleGuard(['EMPLOYEE'])],
        title: 'Collecte — WorkAdapt AI',
        loadComponent: () =>
          import('./features/employee/collecte').then((m) => m.CollectePage),
      },
      {
        path: 'ecarts',
        canActivate: [roleGuard(['EMPLOYEE'])],
        title: 'Mes écarts — WorkAdapt AI',
        loadComponent: () => import('./features/employee/gaps').then((m) => m.GapsPage),
      },
      {
        path: 'ecarts/:gapId',
        canActivate: [roleGuard(['EMPLOYEE'])],
        title: 'Détail de l’écart — WorkAdapt AI',
        loadComponent: () =>
          import('./features/employee/gap-detail').then((m) => m.GapDetailPage),
      },
      {
        path: 'formations',
        canActivate: [roleGuard(['EMPLOYEE'])],
        title: 'Mes formations — WorkAdapt AI',
        loadComponent: () =>
          import('./features/employee/trainings').then((m) => m.TrainingsPage),
      },
      {
        path: 'formations/:requestId',
        canActivate: [roleGuard(['EMPLOYEE'])],
        title: 'Formation en cours — WorkAdapt AI',
        loadComponent: () =>
          import('./features/training/training-workspace').then((m) => m.TrainingWorkspace),
      },
      {
        path: 'evaluations/:requestId',
        canActivate: [roleGuard(['EMPLOYEE'])],
        title: 'Évaluation — WorkAdapt AI',
        loadComponent: () =>
          import('./features/evaluation/evaluation-workspace').then(
            (m) => m.EvaluationWorkspace,
          ),
      },
      {
        path: 'certificats',
        canActivate: [roleGuard(['EMPLOYEE'])],
        title: 'Mes certificats — WorkAdapt AI',
        loadComponent: () =>
          import('./features/employee/certificates').then((m) => m.CertificatesPage),
      },
      {
        path: 'certificats/:id',
        canActivate: [roleGuard(['EMPLOYEE'])],
        title: 'Certificat — WorkAdapt AI',
        loadComponent: () =>
          import('./features/employee/certificate-detail').then((m) => m.CertificateDetail),
      },
      {
        path: 'veille',
        canActivate: [roleGuard(['EMPLOYEE'])],
        title: 'Veille technologique — WorkAdapt AI',
        loadComponent: () =>
          import('./features/employee/tech-watch').then((m) => m.TechWatchPage),
      },
      {
        path: 'profil',
        canActivate: [roleGuard(['EMPLOYEE'])],
        title: 'Mon profil — WorkAdapt AI',
        loadComponent: () => import('./features/employee/profile').then((m) => m.ProfilePage),
      },
      {
        path: 'entretien',
        canActivate: [roleGuard(['EMPLOYEE'])],
        title: 'Entretien IA — WorkAdapt AI',
        loadComponent: () => import('./features/employee/interview').then((m) => m.InterviewPage),
      },
      {
        path: 'notifications',
        title: 'Notifications — WorkAdapt AI',
        loadComponent: () =>
          import('./features/notifications/notifications').then((m) => m.NotificationsPage),
      },
      {
        path: 'confidentialite',
        title: 'Confidentialité — WorkAdapt AI',
        loadComponent: () =>
          import('./features/legal/confidentiality').then((m) => m.ConfidentialityPage),
      },
      {
        // La décision d'approuver un curriculum est réservée au superviseur :
        // aucun rôle technique ne peut le faire.
        path: 'validations',
        canActivate: [roleGuard(['MANAGER'])],
        title: 'Validations — WorkAdapt AI',
        loadComponent: () =>
          import('./features/supervisor/validations').then((m) => m.ValidationsPage),
      },
      {
        path: 'validations/:requestId',
        canActivate: [roleGuard(['MANAGER'])],
        title: 'Revue de parcours — WorkAdapt AI',
        loadComponent: () =>
          import('./features/supervisor/validation-detail').then((m) => m.ValidationDetail),
      },
      {
        path: 'suivi-formations',
        canActivate: [roleGuard(['MANAGER', 'ADMIN'])],
        title: 'Suivi des formations — WorkAdapt AI',
        loadComponent: () =>
          import('./features/supervisor/followup').then((m) => m.FollowupPage),
      },
      {
        path: 'resultats',
        canActivate: [roleGuard(['MANAGER', 'ADMIN'])],
        title: 'Résultats — WorkAdapt AI',
        loadComponent: () =>
          import('./features/supervisor/results').then((m) => m.ResultsPage),
      },
      {
        path: 'equipe',
        canActivate: [roleGuard(['MANAGER', 'ADMIN'])],
        title: 'Mon équipe — WorkAdapt AI',
        loadComponent: () =>
          import('./features/supervisor/team').then((m) => m.TeamPage),
      },
      {
        path: 'agents',
        canActivate: [roleGuard(['ADMIN', 'RH'])],
        title: 'Agents IA — WorkAdapt AI',
        loadComponent: () =>
          import('./features/admin/agents').then((m) => m.AgentsPage),
      },
      {
        path: 'admin',
        canActivate: [roleGuard(['ADMIN'])],
        title: 'Administration — WorkAdapt AI',
        loadComponent: () =>
          import('./features/admin/admin').then((m) => m.AdminPage),
      },
      {
        path: 'rh',
        canActivate: [roleGuard(['RH', 'ADMIN'])],
        title: 'Pilotage RH — WorkAdapt AI',
        loadComponent: () =>
          import('./features/hr/hr-dashboard').then((m) => m.HrDashboard),
      },
      {
        path: 'rh/besoins',
        canActivate: [roleGuard(['RH', 'ADMIN'])],
        title: 'Besoins de formation — WorkAdapt AI',
        loadComponent: () =>
          import('./features/hr/hr-needs').then((m) => m.HrNeedsPage),
      },
      {
        path: 'rh/tendances',
        canActivate: [roleGuard(['RH', 'ADMIN'])],
        title: 'Tendances — WorkAdapt AI',
        loadComponent: () =>
          import('./features/hr/hr-trends').then((m) => m.HrTrendsPage),
      },
      {
        path: 'rh/rapports',
        canActivate: [roleGuard(['RH', 'ADMIN'])],
        title: 'Rapports — WorkAdapt AI',
        loadComponent: () =>
          import('./features/hr/hr-reports').then((m) => m.HrReportsPage),
      },
      {
        path: 'rh/certifications',
        canActivate: [roleGuard(['RH', 'ADMIN'])],
        title: 'Certifications — WorkAdapt AI',
        loadComponent: () =>
          import('./features/hr/hr-certifications').then((m) => m.HrCertificationsPage),
      },
      {
        // Journal nominatif (acteurs humans) : réservé à l'administrateur.
        // Le rôle RH reste sur les vues agrégées, sans identité.
        path: 'rh/audit',
        canActivate: [roleGuard(['ADMIN'])],
        title: 'Journal d’audit — WorkAdapt AI',
        loadComponent: () =>
          import('./features/hr/hr-audit').then((m) => m.HrAuditPage),
      },
      {
        // Annuaire nominatif (nom, e-mail, poste) : réservé à l'administrateur.
        path: 'rh/utilisateurs',
        canActivate: [roleGuard(['ADMIN'])],
        title: 'Utilisateurs — WorkAdapt AI',
        loadComponent: () =>
          import('./features/hr/hr-users').then((m) => m.HrUsersPage),
      },
      { path: '**', redirectTo: 'tableau-de-bord' },
    ],
  },
  { path: '**', redirectTo: 'app' },
];
