/**
 * Contrats de données du frontend WorkAdapt AI — v2.
 *
 * Règle d'architecture : chaque domaine est étanche.
 *  - Formation  : programmes, unités, progression, conditions de fin.
 *  - Évaluation : 5 méthodes, aucun module, aucune étape de formation.
 *  - Certification : certificats, produits uniquement après réussite.
 *
 * Ces types reproduisent la forme des futurs objets renvoyés par l'API
 * Spring Boot (`/api/v1/...`). Tant que le backend n'existe pas, ils sont
 * alimentés par les services de `core/data`.
 */

/* ------------------------------------------------------------------ *
 * Identité et rôles
 * ------------------------------------------------------------------ */

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
  /** Identifiant métier de l'employé : cible des notifications et des preuves. */
  employeeId?: string;
}

/* ------------------------------------------------------------------ *
 * Onboarding : domaine, poste, outils, objectifs, consentement
 * ------------------------------------------------------------------ */

export type Domain =
  | 'DEV'
  | 'DATA_AI'
  | 'ECOMMERCE'
  | 'AUDIT_QUALITY'
  | 'MARKETING'
  | 'RH'
  | 'FINANCE'
  | 'DESIGN'
  | 'OTHER';

export const DOMAIN_LABELS: Record<Domain, string> = {
  DEV: 'Développement logiciel',
  DATA_AI: 'Data / IA',
  ECOMMERCE: 'E-commerce',
  AUDIT_QUALITY: 'Audit / Qualité',
  MARKETING: 'Marketing',
  RH: 'Ressources humaines',
  FINANCE: 'Finance',
  DESIGN: 'Design / UX',
  OTHER: 'Autre',
};

export type Seniority = 'JUNIOR' | 'CONFIRMED' | 'SENIOR' | 'LEAD';

export const SENIORITY_LABELS: Record<Seniority, string> = {
  JUNIOR: 'Junior (0–2 ans)',
  CONFIRMED: 'Confirmé (2–5 ans)',
  SENIOR: 'Senior (5–10 ans)',
  LEAD: 'Lead / Expert (10 ans et +)',
};

export interface Consent {
  collect: boolean;
  shareWithSupervisor: boolean;
  at: string;
}

export interface CvExtraction {
  fileName: string;
  uploadedAt: string;
  experiences: string[];
  skills: string[];
  tools: string[];
  certifications: string[];
  projects: string[];
}

export interface PastTraining {
  id: string;
  title: string;
  provider: string;
  year: number;
  completed: boolean;
  certificate?: string;
}

export interface OnboardingProfile {
  id: string;
  userId: string;
  /** Identifiant métier de l'employé (notifications, preuves, certificats). */
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  department: string;
  jobTitle: string;
  domain: Domain;
  seniority: Seniority;
  tools: string[];
  projects: string[];
  objectives: string[];
  weeklyHours: number;
  preferences: TrainingFormat[];
  consent: Consent;
  cv?: CvExtraction;
  pastTrainings: PastTraining[];
  updatedAt: string;
}

/* ------------------------------------------------------------------ *
 * Compétences, preuves, historique
 * ------------------------------------------------------------------ */

export type SkillSource = 'OBSERVED' | 'DECLARED' | 'ASSESSED' | 'CERTIFIED';

export const SKILL_SOURCE_LABELS: Record<SkillSource, string> = {
  OBSERVED: 'Observé',
  DECLARED: 'Déclaré',
  ASSESSED: 'Évalué',
  CERTIFIED: 'Certifié',
};

/**
 * Preuve horodatée. `observed` distingue le fait constaté de l'inférence IA
 * (CDC §6.6). Une observation ne prouve jamais à elle seule la maîtrise.
 */
export interface EvidenceRef {
  id: string;
  at: string;
  source: CollectionSource;
  statement: string;
  observed: boolean;
  confidence: number;
}

export type GapLifecycle =
  | 'NOUVEAU'
  | 'EN_ATTENTE'
  | 'RECONNU'
  | 'EN_FORMATION'
  | 'PARTIELLEMENT_RESOLU'
  | 'RESOLU'
  | 'TOUJOURS_OUVERT';

export const GAP_LIFECYCLE_LABELS: Record<GapLifecycle, string> = {
  NOUVEAU: 'Nouvel écart',
  EN_ATTENTE: 'En attente',
  RECONNU: 'Pris en compte',
  EN_FORMATION: 'Formation en cours',
  PARTIELLEMENT_RESOLU: 'Partiellement résolu',
  RESOLU: 'Résolu',
  TOUJOURS_OUVERT: 'Toujours ouvert',
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
  evidence: EvidenceRef[];
  lastAssessed?: string;
  updatedAt: string;
}

export interface SkillHistoryEntry {
  id: string;
  at: string;
  skillCode: string;
  skill: string;
  previousLevel: number;
  newLevel: number;
  cause: 'FORMATION' | 'EVALUATION' | 'ACTIVITE_OBSERVEE' | 'VEILLE';
  evidenceIds: string[];
  confidence: number;
}

export type GapPriority = 'HIGH' | 'MEDIUM' | 'LOW';

export interface SkillGap {
  id: string;
  skillCode: string;
  skillLabel: string;
  currentLevel: number;
  targetLevel: number;
  gap: number;
  priority: GapPriority;
  confidence: number;
  /** Faits observés, horodatés et sourcés. */
  observedFacts: EvidenceRef[];
  /** Ce que l'IA en déduit, formulé comme une inférence. */
  inference: string;
  sources: SkillSource[];
  recommendedFormats: TrainingFormat[];
  status: GapLifecycle;
  detectedAt: string;
  requestId?: string;
  resolvedAt?: string;
  /** Raison de la mise en attente pendant une autre formation. */
  queueNote?: string;
}

/* ------------------------------------------------------------------ *
 * Collecte : fil permanent
 * ------------------------------------------------------------------ */

export type CollectionSource =
  | 'CV'
  | 'INTERVIEW'
  | 'COLLECTOR'
  | 'CONNECTED_APP'
  | 'PAST_TRAINING'
  | 'TRAINING_COMPLETION'
  | 'TRAINING_STEP'
  | 'EVALUATION_RESULT'
  | 'TECH_WATCH';

export const COLLECTION_SOURCE_LABELS: Record<CollectionSource, string> = {
  CV: 'CV',
  INTERVIEW: 'Entretien IA',
  COLLECTOR: 'Desktop Collector',
  CONNECTED_APP: 'Application connectée',
  PAST_TRAINING: 'Formation antérieure',
  TRAINING_COMPLETION: 'Formation terminée',
  TRAINING_STEP: 'Vérification d’étape',
  EVALUATION_RESULT: 'Résultat d’évaluation',
  TECH_WATCH: 'Veille technologique',
};

export type CollectionEventType =
  | 'APP_USAGE'
  | 'PROJECT_ACTIVITY'
  | 'CERTIFICATION'
  | 'TRAINING_DONE'
  | 'STEP_VERIFICATION'
  | 'ASSESSMENT_DONE'
  | 'TECH_SIGNAL'
  | 'PROFILE_UPDATE';

export interface CollectionEvent {
  id: string;
  at: string;
  source: CollectionSource;
  type: CollectionEventType;
  label: string;
  detail: string;
  skillCodes: string[];
  observed: boolean;
  confidence: number;
  proof: string;
}

export type CollectionRunStatus = 'SUCCESS' | 'PARTIAL' | 'FAILED';

export interface CollectionRun {
  id: string;
  kind: 'INITIAL' | 'DAILY';
  startedAt: string;
  finishedAt?: string;
  eventsCount: number;
  newGaps: number;
  status: CollectionRunStatus;
  error?: string;
  sourcesUsed: CollectionSource[];
}

export interface DataSource {
  code: CollectionSource;
  label: string;
  description: string;
  status: 'CONNECTED' | 'PARTIAL' | 'NOT_CONNECTED';
  lastSync?: string;
  records?: number;
}

/* ------------------------------------------------------------------ *
 * Sept formats de formation (CDC §5.X)
 * ------------------------------------------------------------------ */

export type TrainingFormat =
  | 'MULTIMEDIA'
  | 'INTERACTIVE'
  | 'PRACTICAL'
  | 'PROJECT'
  | 'SIMULATION'
  | 'AI_TUTORED'
  | 'COLLABORATIVE';

export const TRAINING_FORMATS: TrainingFormat[] = [
  'MULTIMEDIA',
  'INTERACTIVE',
  'PRACTICAL',
  'PROJECT',
  'SIMULATION',
  'AI_TUTORED',
  'COLLABORATIVE',
];

export const FORMAT_LABELS: Record<TrainingFormat, string> = {
  MULTIMEDIA: 'Multimédia',
  INTERACTIVE: 'Interactive',
  PRACTICAL: 'Pratique',
  PROJECT: 'Projet',
  SIMULATION: 'Simulation',
  AI_TUTORED: 'Tuteur IA',
  COLLABORATIVE: 'Collaboratif',
};

export type FormatAccent = 'blue' | 'violet' | 'teal' | 'amber' | 'green' | 'rose' | 'slate';

export interface TrainingFormatInfo {
  code: TrainingFormat;
  label: string;
  tagline: string;
  unitLabel: string;
  presentation: string;
  howItWorks: string[];
  aiRole: string[];
  example: string;
  proof: string;
  icon: string;
  accent: FormatAccent;
  /** Durée cible en heures pour un écart standard. */
  typicalHours: string;
  recommendedFor: string[];
}

/* ------------------------------------------------------------------ *
 * Programmes de formation — 7 structures distinctes
 * ------------------------------------------------------------------ */

export type ProgramStatus =
  | 'GENERATING'
  | 'READY'
  | 'APPROVED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'FAILED';

export interface StudySession {
  id: string;
  day: string;
  label: string;
  focus: string;
  minutes: number;
}

export interface CompletionCriteria {
  minMinutes: number;
  requiredUnits: number;
  requireAllCheckpoints: boolean;
  requireCapstone: boolean;
  /** Seuil de réussite de l'évaluation finale (défini par formation). */
  passScore: number;
  evidenceLabel: string;
}

export interface ComplementaryActivity {
  id: string;
  format: TrainingFormat;
  title: string;
  rationale: string;
  minutes: number;
}

interface ProgramBase {
  id: string;
  requestId: string;
  skillCode: string;
  skillLabel: string;
  title: string;
  summary: string;
  domain: Domain;
  subject: string;
  levelFrom: number;
  levelTo: number;
  estimatedHours: number;
  estimatedDays: number;
  objectives: string[];
  studyPlan: StudySession[];
  completion: CompletionCriteria;
  complementary: ComplementaryActivity[];
  recommendedEvaluation: EvaluationMethod[];
  status: ProgramStatus;
  generatedAt: string;
}

/** Un épisode multimédias : vidéo + article + podcast + notes + restitution. */
export interface MultimediaEpisode {
  id: string;
  order: number;
  title: string;
  objective: string;
  video: { title: string; durationMinutes: number; chapters: string[] };
  article: { title: string; sections: string[] };
  podcast: { title: string; durationMinutes: number; summary: string };
  keyPoints: string[];
  notesPrompt: string;
  restitutionQuestion: string;
  estimatedMinutes: number;
}

export interface MultimediaProgram extends ProgramBase {
  format: 'MULTIMEDIA';
  episodes: MultimediaEpisode[];
  synthesisDossier: { title: string; sections: string[]; conceptMap: string[] };
}

/** Un deck de drills : notions, cartes, questions, seuil de maîtrise. */
export interface DrillSet {
  id: string;
  order: number;
  title: string;
  notion: string;
  cards: { front: string; back: string }[];
  drills: ExamQuestion[];
  masteryThreshold: number;
  spacedReview: string[];
  estimatedMinutes: number;
}

export interface InteractiveProgram extends ProgramBase {
  format: 'INTERACTIVE';
  drillSets: DrillSet[];
  finalChallenge: { title: string; rules: string[]; questions: ExamQuestion[] };
}

/** Un lab pratique : consignes, environnement, étapes, critères, validation. */
export interface Lab {
  id: string;
  order: number;
  title: string;
  brief: string;
  environment: string;
  steps: string[];
  hints: string[];
  commands: string[];
  successCriteria: string[];
  validationMode: 'AUTO' | 'CRITERIA' | 'HUMAN';
  estimatedMinutes: number;
}

export interface PracticalProgram extends ProgramBase {
  format: 'PRACTICAL';
  labs: Lab[];
  finalTask: { title: string; brief: string; criteria: string[]; deliverable: string };
}

/** Un jalon de projet : livrable, critères, revue. */
export interface Milestone {
  id: string;
  order: number;
  title: string;
  brief: string;
  deliverable: string;
  tasks: string[];
  criteria: string[];
  estimatedMinutes: number;
}

export interface ProjectProgram extends ProgramBase {
  format: 'PROJECT';
  milestones: Milestone[];
  finalReview: { rubric: string[]; acceptance: string[] };
}

/** Un scénario de simulation : situation, signaux, décisions, conséquences. */
export interface SimulationDecision {
  id: string;
  prompt: string;
  options: { label: string; outcome: string; score: number; feedback: string }[];
}

export interface SimulationScenario {
  id: string;
  order: number;
  title: string;
  situation: string;
  signals: string[];
  consoleLines: string[];
  decisions: SimulationDecision[];
  debriefQuestions: string[];
  estimatedMinutes: number;
}

export interface SimulationProgram extends ProgramBase {
  format: 'SIMULATION';
  scenarios: SimulationScenario[];
  incidentReport: { title: string; sections: string[] };
}

/** Une session de tuteur IA : ouverture, relances socratiques, teach-back. */
export interface TutorSession {
  id: string;
  order: number;
  topic: string;
  objective: string;
  opening: string;
  socraticPrompts: string[];
  explanationLevels: string[];
  exercise: { prompt: string; expected: string[]; hints: string[] };
  teachBack: { prompt: string; keywords: string[] };
  estimatedMinutes: number;
}

export interface AiTutoredProgram extends ProgramBase {
  format: 'AI_TUTORED';
  tutorSessions: TutorSession[];
  masteryDialogue: { prompt: string; criteria: string[] };
}

/** Un sprint d'équipe : objectif commun, rôles, contribution, revue par les pairs. */
export interface TeamSprint {
  id: string;
  order: number;
  title: string;
  teamGoal: string;
  roles: { name: string; mission: string; assignee: string }[];
  individualTask: string;
  deliverable: string;
  peerReviewCriteria: string[];
  syncCheckpoints: string[];
  estimatedMinutes: number;
}

export interface CollaborativeProgram extends ProgramBase {
  format: 'COLLABORATIVE';
  sprints: TeamSprint[];
  teamDeliverable: { title: string; acceptance: string[]; contributionProof: string };
}

export type TrainingProgram =
  | MultimediaProgram
  | InteractiveProgram
  | PracticalProgram
  | ProjectProgram
  | SimulationProgram
  | AiTutoredProgram
  | CollaborativeProgram;

/** Progression réelle, commune en stockage mais rendue différemment par format. */
export interface UnitProgress {
  unitId: string;
  status: 'LOCKED' | 'AVAILABLE' | 'IN_PROGRESS' | 'DONE';
  minutesSpent: number;
  completedAt?: string;
  /** Résultat du checkpoint formatif, quand le format en comporte un. */
  checkpointPassed?: boolean;
  notes?: string;
}

export interface TrainingProgress {
  requestId: string;
  programId: string;
  units: UnitProgress[];
  startedAt?: string;
  lastActivityAt?: string;
  completedAt?: string;
  capstoneSubmitted: boolean;
  capstoneValidated: boolean;
  /** Preuve déposée pour le livrable de fin (texte ou référence de fichier). */
  capstoneProof?: string;
  minutesSpent: number;
  masterGatePassed: boolean;
}

/* ------------------------------------------------------------------ *
 * Vérification IA des preuves d'étape
 *
 * Chaque étape de formation produit une preuve (commandes réellement
 * exécutées, critères observés, décisions, restitution écrite). Ces
 * données sont transmises à l'agent d'analyse des preuves, qui statue :
 * une case cochée seule ne valide jamais une étape.
 * ------------------------------------------------------------------ */

/** Verdict de l'agent sur une preuve d'étape. */
export type StepVerdict = 'VALIDE' | 'INCOMPLET' | 'REJETE';

/** Un élément vérifiable : ce qui est fait, et la trace qui le prouve. */
export interface StepEvidenceItem {
  label: string;
  done: boolean;
  /** Observation, sortie de commande ou justification associée. */
  detail?: string;
}

/** Preuve transmise à l'agent pour une unité de formation. */
export interface StepEvidence {
  unitId: string;
  format: TrainingFormat;
  kind: 'COMMANDES' | 'CRITERES' | 'TEXTE' | 'SCENARIO' | 'REVUE' | 'QUIZ';
  /** Commandes réellement exécutées par l'employé. */
  commands?: string[];
  /** Sorties observées pour chaque commande exécutée. */
  outputs?: string[];
  /** Critères de réussite et leur observation. */
  criteria?: StepEvidenceItem[];
  /** Étapes imposées et leur état. */
  steps?: StepEvidenceItem[];
  /** Restitution écrite, teach-back, compte rendu ou livrable. */
  narrative?: string;
  /** Décisions prises (simulation, cas), avec la conséquence observée. */
  decisions?: StepEvidenceItem[];
  /** Temps réellement passé sur l'unité, en minutes. */
  durationMinutes: number;
  /** Durée attendue par le curriculum, en minutes. */
  expectedMinutes: number;
}

/** Résultat de l'analyse d'une preuve d'étape. */
export interface StepVerification {
  id: string;
  requestId: string;
  unitId: string;
  unitTitle: string;
  format: TrainingFormat;
  at: string;
  verdict: StepVerdict;
  /** Note de la preuve, sur 100. */
  score: number;
  /** Confiance de l'agent dans son verdict, sur 1. */
  confidence: number;
  /** Ce que l'agent a réellement contrôlé. */
  checked: string[];
  /** Ce qui manque ou ne tient pas. */
  gaps: string[];
  /** Consigne actionnable pour l'employé. */
  feedback: string;
  /** Résumé exact des données transmises à l'agent (traçabilité). */
  reviewed: string[];
  agent: string;
}

/* ------------------------------------------------------------------ *
 * Demandes de formation et validation superviseur
 * ------------------------------------------------------------------ */

export type TrainingRequestStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'CHANGES_REQUESTED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

export const TRAINING_REQUEST_STATUS_LABELS: Record<TrainingRequestStatus, string> = {
  PENDING: 'En attente de validation',
  APPROVED: 'Approuvée',
  REJECTED: 'Rejetée',
  CHANGES_REQUESTED: 'Modification demandée',
  IN_PROGRESS: 'En cours',
  COMPLETED: 'Terminée',
  CANCELLED: 'Annulée',
};

export interface SupervisorModification {
  at: string;
  note: string;
  removedUnits: string[];
  adjustedHours?: number;
}

export interface TrainingRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  gapId: string;
  skillCode: string;
  skillLabel: string;
  subject: string;
  objective: string;
  domain: Domain;
  format: TrainingFormat;
  levelFrom: number;
  levelTo: number;
  status: TrainingRequestStatus;
  requestedAt: string;
  decidedAt?: string;
  supervisorNote?: string;
  modification?: SupervisorModification;
  trainingId: string;
  progressPercent: number;
  startedAt?: string;
  completedAt?: string;
  evaluationId?: string;
  certificateId?: string;
  origin?: 'GAP' | 'REMEDIATION';
  remediationOf?: string;
}

/* ------------------------------------------------------------------ *
 * Cinq méthodes d'évaluation — aucun contenu de formation
 * ------------------------------------------------------------------ */

export type EvaluationMethod =
  | 'KNOWLEDGE_TEST'
  | 'TECHNICAL_CHALLENGE'
  | 'CASE_ANALYSIS'
  | 'PROFESSIONAL_DOSSIER'
  | 'DEFENSE_INTERVIEW';

export const EVALUATION_METHODS: EvaluationMethod[] = [
  'KNOWLEDGE_TEST',
  'TECHNICAL_CHALLENGE',
  'CASE_ANALYSIS',
  'PROFESSIONAL_DOSSIER',
  'DEFENSE_INTERVIEW',
];

export const EVALUATION_METHOD_LABELS: Record<EvaluationMethod, string> = {
  KNOWLEDGE_TEST: 'Test de connaissances',
  TECHNICAL_CHALLENGE: 'Épreuve technique',
  CASE_ANALYSIS: 'Analyse de cas',
  PROFESSIONAL_DOSSIER: 'Dossier professionnel',
  DEFENSE_INTERVIEW: 'Soutenance professionnelle',
};

export const EVALUATION_METHOD_INFO: Record<
  EvaluationMethod,
  { instrument: string; duration: string; proof: string; icon: string; accent: FormatAccent }
> = {
  KNOWLEDGE_TEST: {
    instrument: 'Examen écrit de maîtrise : QCM à réponses multiples, vrai/faux justifié, questions techniques et mises en situation.',
    duration: '45 à 60 minutes, chronométré',
    proof: 'Score par section et analyse des erreurs',
    icon: 'quiz',
    accent: 'blue',
  },
  TECHNICAL_CHALLENGE: {
    instrument: '2 à 4 tâches techniques réelles à réaliser dans un environnement simulé, avec critères vérifiables.',
    duration: '90 à 180 minutes',
    proof: 'Tâches exécutées et vérifiées critère par critère',
    icon: 'terminal',
    accent: 'teal',
  },
  CASE_ANALYSIS: {
    instrument: 'Dossier professionnel réaliste : diagnostic, décisions et justification écrite.',
    duration: '60 à 90 minutes, documents autorisés',
    proof: 'Raisonnement évalué par grille',
    icon: 'cases',
    accent: 'amber',
  },
  PROFESSIONAL_DOSSIER: {
    instrument: 'Production d’un livrable complet sur plusieurs jours, puis entretien court de vérification.',
    duration: '2 à 5 jours + 5 à 10 minutes',
    proof: 'Livrable conforme à une rubrique',
    icon: 'folder_open',
    accent: 'violet',
  },
  DEFENSE_INTERVIEW: {
    instrument: 'Entretien adaptatif : questions de fond, relances, contre-exemples, cas situationnels.',
    duration: '20 à 30 minutes',
    proof: 'Grille d’entretien et transcription',
    icon: 'record_voice_over',
    accent: 'rose',
  },
};

export type ExamQuestionType =
  | 'QCM'
  | 'MULTI'
  | 'TRUE_FALSE'
  | 'TECHNICAL'
  | 'SCENARIO'
  | 'OPEN';

export const EXAM_TYPE_LABELS: Record<ExamQuestionType, string> = {
  QCM: 'Choix unique',
  MULTI: 'Choix multiples',
  TRUE_FALSE: 'Vrai ou faux',
  TECHNICAL: 'Question technique',
  SCENARIO: 'Situation professionnelle',
  OPEN: 'Réponse ouverte',
};

export interface ExamQuestion {
  id: string;
  type: ExamQuestionType;
  prompt: string;
  options: string[];
  /** Index unique pour QCM / TRUE_FALSE ; indices multiples pour MULTI. */
  correctIndexes: number[];
  explanation: string;
  points: number;
  critical?: boolean;
}

export interface ExamSection {
  id: string;
  title: string;
  objective: string;
  questions: ExamQuestion[];
}

export interface KnowledgeTestDocument {
  method: 'KNOWLEDGE_TEST';
  title: string;
  instructions: string[];
  durationMinutes: number;
  sections: ExamSection[];
}

export interface ChallengeTask {
  id: string;
  title: string;
  brief: string;
  environment: string;
  deliverable: string;
  steps: string[];
  successCriteria: string[];
  points: number;
  hint: string;
}

export interface TechnicalChallengeDocument {
  method: 'TECHNICAL_CHALLENGE';
  title: string;
  instructions: string[];
  durationMinutes: number;
  tasks: ChallengeTask[];
}

export interface CaseFile {
  context: string;
  role: string;
  symptoms: string[];
  data: { label: string; value: string }[];
  constraints: string[];
}

export interface AnalysisQuestion {
  id: string;
  prompt: string;
  guidance: string;
  expectedThemes: string[];
  points: number;
}

export interface CaseAnalysisDocument {
  method: 'CASE_ANALYSIS';
  title: string;
  instructions: string[];
  durationMinutes: number;
  caseFile: CaseFile;
  questions: AnalysisQuestion[];
}

export interface DossierRequirement {
  id: string;
  label: string;
  description: string;
  weight: number;
  mandatory: boolean;
}

export interface ProfessionalDossierDocument {
  method: 'PROFESSIONAL_DOSSIER';
  title: string;
  instructions: string[];
  submissionDays: number;
  brief: string;
  requirements: DossierRequirement[];
  defenseQuestions: { id: string; prompt: string; expectedThemes: string[] }[];
}

export interface InterviewQuestion {
  id: string;
  prompt: string;
  kind: 'FOND' | 'RELANCE' | 'CONTRE_EXEMPLE' | 'SITUATION';
  expectedThemes: string[];
  redFlags: string[];
  points: number;
}

export interface DefenseInterviewDocument {
  method: 'DEFENSE_INTERVIEW';
  title: string;
  instructions: string[];
  durationMinutes: number;
  opening: string;
  questions: InterviewQuestion[];
}

export type EvaluationDocument =
  | KnowledgeTestDocument
  | TechnicalChallengeDocument
  | CaseAnalysisDocument
  | ProfessionalDossierDocument
  | DefenseInterviewDocument;

export type EvaluationStatus =
  | 'EN_FILE'
  | 'GENERATION'
  | 'PRETE'
  | 'EN_COURS'
  | 'SOUMISE'
  | 'CORRECTION'
  | 'CORRIGEE'
  | 'ECHEC';

export const EVALUATION_STATUS_LABELS: Record<EvaluationStatus, string> = {
  EN_FILE: 'En file',
  GENERATION: 'Génération en cours',
  PRETE: 'Prête',
  EN_COURS: 'En cours',
  SOUMISE: 'Soumise',
  CORRECTION: 'Correction en cours',
  CORRIGEE: 'Corrigée',
  ECHEC: 'Échec technique',
};

export type AnswerValue = string | number | number[];

export interface EvaluationAnswers {
  [taskId: string]: AnswerValue;
}

export interface CriterionResult {
  id: string;
  label: string;
  weight: number;
  earned: number;
  max: number;
  comment: string;
  evidence?: string;
}

export type EvaluationDecision = 'REUSSI' | 'ECHOUE' | 'REVUE_HUMAINE';

export interface EvaluationRecord {
  id: string;
  requestId: string;
  trainingId: string;
  employeeId: string;
  employeeName: string;
  method: EvaluationMethod;
  status: EvaluationStatus;
  document: EvaluationDocument;
  answers: EvaluationAnswers;
  corrections: CriterionResult[];
  score: number;
  decision: EvaluationDecision;
  attempt: number;
  generatedAt: string;
  submittedAt?: string;
  correctedAt?: string;
}

export interface NextRecommendation {
  title: string;
  skillCode: string;
  skillLabel: string;
  reason: string;
  formats: TrainingFormat[];
  estimatedHours: number;
  levelFrom: number;
  levelTo: number;
}

export interface EvaluationReport {
  id: string;
  evaluationId: string;
  requestId: string;
  method: EvaluationMethod;
  score: number;
  passScore: number;
  decision: EvaluationDecision;
  criteria: CriterionResult[];
  strengths: string[];
  gaps: string[];
  /**
   * Règles éliminatoires violées : elles invalident l'épreuve quel que
   * soit le score. Vide si aucune règle bloquante n'a été enfreinte.
   */
  blocking?: string[];
  feedback: { notion: string; detail: string; advice: string }[];
  levelBefore: number;
  levelAfter: number;
  recommendations: NextRecommendation[];
  at: string;
  attempt: number;
}

/* ------------------------------------------------------------------ *
 * Certification — domaine séparé
 * ------------------------------------------------------------------ */

export interface Certificate {
  id: string;
  requestId: string;
  trainingId: string;
  evaluationId: string;
  employeeId: string;
  employeeName: string;
  formationTitle: string;
  skillLabel: string;
  method: EvaluationMethod;
  score: number;
  levelBefore: number;
  levelAfter: number;
  criteriaValidated: string[];
  issuedAt: string;
  format: TrainingFormat;
}

/* ------------------------------------------------------------------ *
 * Notifications
 * ------------------------------------------------------------------ */

export type AppNotificationType =
  | 'GAP_DETECTED'
  | 'GAP_QUEUED'
  | 'TRAINING_SUBMITTED'
  | 'TRAINING_APPROVED'
  | 'TRAINING_REJECTED'
  | 'CHANGES_REQUESTED'
  | 'TRAINING_STARTED'
  | 'TRAINING_MILESTONE'
  | 'TRAINING_STEP_REJECTED'
  | 'TRAINING_COMPLETED'
  | 'EVALUATION_READY'
  | 'EVALUATION_PASSED'
  | 'EVALUATION_FAILED'
  | 'CERTIFICATE_ISSUED'
  | 'REMEDIATION_CREATED'
  | 'COLLECTION_FAILED'
  | 'PROFILE_UPDATED';

export interface AppNotification {
  id: string;
  type: AppNotificationType;
  title: string;
  message: string;
  at: string;
  read: boolean;
  link?: string;
  audience: Role[];
  employeeId?: string;
}

/* ------------------------------------------------------------------ *
 * Veille technologique (agent dédié, CDC §9.3)
 * ------------------------------------------------------------------ */

export interface TechSignal {
  id: string;
  technology: string;
  category: string;
  skillCode: string;
  skillLabel: string;
  maturity: 'EMERGENTE' | 'ADOPTION' | 'MATURE';
  relevance: 'HAUTE' | 'MOYENNE' | 'FAIBLE';
  why: string;
  source: string;
  at: string;
  suggestedAction: string;
}

/* ------------------------------------------------------------------ *
 * Profil, entretien, équipe, pilotage
 * ------------------------------------------------------------------ */

export interface InterviewMessage {
  id: string;
  author: 'AI' | 'USER';
  text: string;
  at: string;
}

export interface InterviewAction {
  title: string;
  description: string;
  link: string;
  action: string;
  tone: 'primary' | 'success' | 'warning';
}

export interface InterviewDiagnosticResult {
  id: string;
  at: string;
  quizScore: number;
  scenarioScore: number;
  globalScore: number;
  strengths: string[];
  watchpoints: string[];
  actions: InterviewAction[];
}

export interface MemberSkill {
  code: string;
  label: string;
  level: number;
  target: number;
  confidence: number;
  source: SkillSource;
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
  certifications: number;
  activeFormation?: string;
  formationProgress: number;
  lastEvaluation?: { method: EvaluationMethod; score: number; decision: EvaluationDecision; at: string };
  skills?: MemberSkill[];
  lastActivityAt?: string;
}

export type TrainingFollowUpStatus =
  | 'PENDING_APPROVAL'
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'FAILED';

export interface TrainingFollowUp {
  id: string;
  employee: string;
  employeeId: string;
  formationTitle: string;
  format: TrainingFormat;
  status: TrainingFollowUpStatus;
  progress: number;
  unitsDone: number;
  unitsTotal: number;
  minutesSpent: number;
  lastEvaluation?: number;
  updatedAt: string;
}

export interface TrainingNeed {
  id: string;
  skill: string;
  department: string;
  employeesConcerned: number;
  averageGap: number;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  recommendedFormats: TrainingFormat[];
  trend: number;
}

export interface SkillTrendPoint {
  month: string;
  level: number;
}

export interface SkillTrendSeries {
  skill: string;
  points: SkillTrendPoint[];
}

export interface ReportExport {
  id: string;
  title: string;
  period: string;
  scope: string;
  format: 'CSV' | 'PDF';
  generatedAt: string;
  records: number;
}

/* ------------------------------------------------------------------ *
 * KPI (CDC §3.3) et audit
 * ------------------------------------------------------------------ */

export type KpiUnit = 'PERCENT' | 'POINTS' | 'MINUTES' | 'SECONDS';

export interface Kpi {
  code: string;
  label: string;
  definition: string;
  target: number;
  current: number;
  unit: KpiUnit;
  direction: 'UP' | 'DOWN';
}

export interface AuditEntry {
  id: string;
  at: string;
  actor: string;
  action: string;
  target: string;
  detail: string;
  ip: string;
}

/* ------------------------------------------------------------------ *
 * Agents (CDC §8.2) et orchestrateur
 * ------------------------------------------------------------------ */

export type AgentHealth = 'RUNNING' | 'IDLE' | 'WAITING_APPROVAL' | 'ERROR';

export interface AgentStatus {
  code: string;
  name: string;
  mission: string;
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
  label: string;
  startedAt: string;
  status: WorkflowStatus;
  currentStep: string;
  steps: WorkflowStep[];
}

export interface AgentExchange {
  id: string;
  at: string;
  from: string;
  to: string;
  topic: string;
  status: 'DELIVERED' | 'PENDING' | 'FAILED';
}
