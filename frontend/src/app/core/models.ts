/**
 * Contrats de données du frontend WorkAdapt AI.
 *
 * Ces types reproduisent volontairement la forme des futurs objets renvoyés
 * par l'API Spring Boot (`/api/v1/...`). Tant que le backend n'existe pas,
 * ils sont alimentés par `core/data/mock-data.ts`. Le jour où l'API est
 * disponible, seule l'implémentation des services change.
 */

export type Role = 'EMPLOYEE' | 'MANAGER' | 'RH' | 'ADMIN';

export const ROLE_LABELS: Record<Role, string> = {
  EMPLOYEE: 'Employé',
  MANAGER: 'Superviseur',
  RH: 'Ressources humaines',
  ADMIN: 'Administrateur',
};

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  jobTitle: string;
  department: string;
  initials: string;
}

/** Origine d'une estimation : le CDC impose de distinguer observation et inférence. */
export type SkillSource = 'OBSERVED' | 'DECLARED' | 'ASSESSED' | 'CERTIFIED';

export const SKILL_SOURCE_LABELS: Record<SkillSource, string> = {
  OBSERVED: 'Observé',
  DECLARED: 'Déclaré',
  ASSESSED: 'Évalué',
  CERTIFIED: 'Certifié',
};

export interface SkillEstimate {
  code: string;
  label: string;
  category: string;
  /** Niveau estimé, 0-100. */
  level: number;
  /** Niveau attendu pour le poste, 0-100. */
  target: number;
  /** Degré de confiance de l'estimation, 0-1. */
  confidence: number;
  /** Évolution sur 30 jours, en points. */
  trend: number;
  source: SkillSource;
  evidence: string[];
  lastAssessed?: string;
}

/** Les sept formats de formation du CDC v2.0. */
export type ModuleFormat =
  | 'MULTIMEDIA'
  | 'INTERACTIVE'
  | 'PRACTICAL'
  | 'PROJECT'
  | 'SIMULATION'
  | 'AI_TUTORED'
  | 'COLLABORATIVE';

export const FORMAT_LABELS: Record<ModuleFormat, string> = {
  MULTIMEDIA: 'Multimédia',
  INTERACTIVE: 'Interactive',
  PRACTICAL: 'Pratique',
  PROJECT: 'Projet',
  SIMULATION: 'Simulation',
  AI_TUTORED: 'Personnalisée IA',
  COLLABORATIVE: 'Collaborative',
};

export type ModuleStatus = 'LOCKED' | 'AVAILABLE' | 'IN_PROGRESS' | 'DONE';

export interface CourseModule {
  order: number;
  title: string;
  format: ModuleFormat;
  durationMinutes: number;
  status: ModuleStatus;
  progress: number;
  /** Activité de l'employé telle que décrite dans le tableau du CDC §5.X.1. */
  activity: string;
  objectives: string[];
}

export type CourseStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'IN_PROGRESS'
  | 'COMPLETED';

export const COURSE_STATUS_LABELS: Record<CourseStatus, string> = {
  DRAFT: 'Brouillon',
  PENDING_APPROVAL: 'En attente de validation',
  APPROVED: 'Approuvé',
  REJECTED: 'Rejeté',
  IN_PROGRESS: 'En cours',
  COMPLETED: 'Terminé',
};

export interface Course {
  id: string;
  title: string;
  summary: string;
  skills: string[];
  levelFrom: number;
  levelTo: number;
  durationMinutes: number;
  status: CourseStatus;
  progress: number;
  createdAt: string;
  modules: CourseModule[];
}

export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED';

export interface ApprovalRequest {
  id: string;
  employee: string;
  jobTitle: string;
  courseTitle: string;
  skills: string[];
  levelFrom: number;
  levelTo: number;
  durationMinutes: number;
  requestedAt: string;
  status: ApprovalStatus;
  justification: string;
}

export interface Certificate {
  id: string;
  title: string;
  skills: string[];
  issuedAt: string;
  score: number;
  practicalPassed: boolean;
  level: number;
  /** Parcours dont le certificat atteste la réussite. */
  courseId?: string;
  /** Critères de réussite validés (CDC §5.X.2.5). */
  criteria?: string[];
}

export type AgentHealth = 'RUNNING' | 'IDLE' | 'WAITING_APPROVAL' | 'ERROR';

export interface AgentStatus {
  code: string;
  name: string;
  description: string;
  health: AgentHealth;
  lastRun: string;
  durationMs: number;
  successRate: number;
}

export type WorkflowStatus = 'RUNNING' | 'COMPLETED' | 'WAITING_APPROVAL' | 'FAILED';
export type StepState = 'DONE' | 'RUNNING' | 'PENDING' | 'FAILED';

export interface WorkflowStep {
  name: string;
  agent: string;
  state: StepState;
  at?: string;
  durationMs?: number;
}

export interface WorkflowRun {
  id: string;
  employee: string;
  startedAt: string;
  status: WorkflowStatus;
  currentStep: string;
  steps: WorkflowStep[];
}

/** Message échangé entre deux agents lors d'une exécution (CDC §11.5). */
export interface AgentExchange {
  id: string;
  at: string;
  from: string;
  to: string;
  topic: string;
  status: 'DELIVERED' | 'PENDING' | 'FAILED';
}

export type KpiUnit = 'PERCENT' | 'POINTS' | 'MINUTES';

export interface Kpi {
  code: string;
  label: string;
  target: number;
  current: number;
  unit: KpiUnit;
  direction: 'UP' | 'DOWN';
  hint: string;
}

export interface AuditEntry {
  id: string;
  at: string;
  actor: string;
  action: string;
  target: string;
  ip: string;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: Role;
  jobTitle: string;
  department: string;
  status: 'ACTIVE' | 'INVITED' | 'DISABLED';
  skillsTracked: number;
  averageLevel: number;
  /** Nombre de parcours terminés (certificats internes obtenus). */
  coursesCompleted: number;
  /** Parcours actuellement suivi, si applicable. */
  activeCourse?: string;
  /** Progression du parcours actif, 0-100. */
  courseProgress: number;
  /** Score du dernier quiz final, si disponible. */
  lastAssessment?: number;
}

export interface InterviewMessage {
  id: string;
  author: 'AI' | 'USER';
  text: string;
  at: string;
}

/**
 * Étape de l'historique des évolutions d'une compétence (CDC §11.1).
 * Conserve le niveau précédent, le nouveau niveau et la cause du mouvement.
 */
export interface SkillHistoryEntry {
  id: string;
  at: string;
  skill: string;
  previousLevel: number;
  newLevel: number;
  source: SkillSource;
  cause: string;
}

export interface DataSource {
  code: string;
  label: string;
  description: string;
  status: 'CONNECTED' | 'PARTIAL' | 'NOT_CONNECTED';
  lastSync?: string;
  records?: number;
}

/* ------------------------------------------------------------------ *
 * Catalogue des sept formats de formation (CDC v2.0, §5.X)
 * ------------------------------------------------------------------ */

export type FormatAccent = 'blue' | 'violet' | 'teal' | 'amber' | 'green' | 'rose' | 'slate';

/** Fiche pédagogique d'un format : présentation, déroulement, rôle de l'IA, exemple. */
export interface TrainingFormatInfo {
  code: ModuleFormat;
  label: string;
  englishLabel: string;
  tagline: string;
  presentation: string;
  howItWorks: string[];
  aiRole: string[];
  example: string;
  icon: string;
  accent: FormatAccent;
}

/* ------------------------------------------------------------------ *
 * Évaluation et certification (CDC v2.0, §5.X.2 et §5.X.3)
 * ------------------------------------------------------------------ */

export type QuizQuestionType = 'QCM' | 'TRUE_FALSE' | 'TECHNICAL' | 'SCENARIO';

export const QUIZ_TYPE_LABELS: Record<QuizQuestionType, string> = {
  QCM: 'Choix multiples',
  TRUE_FALSE: 'Vrai ou faux',
  TECHNICAL: 'Question technique',
  SCENARIO: 'Situation professionnelle',
};

export interface QuizQuestion {
  id: string;
  type: QuizQuestionType;
  prompt: string;
  options: string[];
  /** Index de la bonne réponse dans `options`. */
  correctIndex: number;
  explanation: string;
  skill: string;
}

export type PracticalCriterionResult = 'MET' | 'NOT_MET' | 'HUMAN_REVIEW' | 'PENDING';

export interface PracticalCriterion {
  label: string;
  /** Vérifiable automatiquement ; sinon validation humaine requise. */
  autoCheckable: boolean;
  result: PracticalCriterionResult;
  hint: string;
}

export interface PracticalAssessment {
  id: string;
  title: string;
  brief: string;
  steps: string[];
  criteria: PracticalCriterion[];
  submissionHint: string;
  humanValidationRequired: boolean;
}

export interface FeedbackExplanation {
  notion: string;
  detail: string;
  advice: string;
}

export interface AiFeedback {
  mastered: string[];
  difficulties: string[];
  explanations: FeedbackExplanation[];
  extraExercises: string[];
}

export interface ProgressReport {
  courseTitle: string;
  skills: string[];
  quizScore: number;
  practicalResult: string;
  mastered: string[];
  difficulties: string[];
  improvements: string[];
  recommendations: string[];
  levelBefore: number;
  levelAfter: number;
}

export type AssessmentStageCode =
  | 'QUIZ'
  | 'PRACTICAL'
  | 'FEEDBACK'
  | 'REPORT'
  | 'CERTIFICATE'
  | 'RECOMMENDATIONS';

export type AssessmentStageStatus = 'LOCKED' | 'AVAILABLE' | 'CURRENT' | 'DONE';

export interface AssessmentStage {
  code: AssessmentStageCode;
  label: string;
  description: string;
  status: AssessmentStageStatus;
}

export interface NextRecommendation {
  title: string;
  skill: string;
  reason: string;
  formats: ModuleFormat[];
  durationMinutes: number;
  levelFrom: number;
  levelTo: number;
}

export interface Assessment {
  id: string;
  courseId: string;
  courseTitle: string;
  quiz: QuizQuestion[];
  practical: PracticalAssessment;
  feedback: AiFeedback;
  report: ProgressReport;
  /** Seuil de réussite du quiz final imposé par le CDC (75 %). */
  passScore: number;
  recommendations: NextRecommendation[];
}
