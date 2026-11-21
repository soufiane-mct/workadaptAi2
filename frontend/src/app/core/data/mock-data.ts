import {
  AgentExchange,
  AgentStatus,
  AppNotification,
  AuditEntry,
  Certificate,
  CollectionEvent,
  CollectionRun,
  DataSource,
  Domain,
  EvidenceRef,
  Kpi,
  OnboardingProfile,
  PastTraining,
  ReportExport,
  SkillEstimate,
  SkillGap,
  SkillHistoryEntry,
  SkillTrendSeries,
  TeamMember,
  TechSignal,
  TrainingFormatInfo,
  TrainingNeed,
  TrainingRequest,
  User,
  WorkflowRun,
} from '../models';

const NOW = new Date();
const day = (offset: number): string => {
  const date = new Date(NOW);
  date.setDate(date.getDate() + offset);
  return date.toISOString();
};
const dateOnly = (offset: number): string => day(offset).slice(0, 10);

/* ------------------------------------------------------------------ *
 * Comptes de démonstration
 * ------------------------------------------------------------------ */

export const DEMO_ACCOUNTS: User[] = [
  {
    id: 'usr-0001',
    name: 'Soufiane Mechta',
    email: 'soufiane.mechta@workadapt.demo',
    role: 'EMPLOYEE',
    jobTitle: 'Développeur serveur',
    department: 'Ingénierie',
    initials: 'SM',
    employeeId: 'emp-0001',
  },
  {
    id: 'usr-0002',
    name: 'Ahmed El Fellah',
    email: 'ahmed.elfellah@workadapt.demo',
    role: 'MANAGER',
    jobTitle: 'Responsable ingénierie',
    department: 'Ingénierie',
    initials: 'AE',
  },
  {
    id: 'usr-0003',
    name: 'Kawtar Souiyah',
    email: 'kawtar.souiyah@workadapt.demo',
    role: 'RH',
    jobTitle: 'Responsable développement RH',
    department: 'Ressources humaines',
    initials: 'KS',
  },
  {
    id: 'usr-0004',
    name: 'Yassine Berrada',
    email: 'yassine.berrada@workadapt.demo',
    role: 'ADMIN',
    jobTitle: 'Administrateur plateforme',
    department: 'Systèmes d’information',
    initials: 'YB',
  },
];

/* ------------------------------------------------------------------ *
 * Profil d’onboarding
 * ------------------------------------------------------------------ */

export const INITIAL_PROFILE: OnboardingProfile = {
  id: 'prof-0001',
  userId: 'usr-0001',
  employeeId: 'emp-0001',
  firstName: 'Soufiane',
  lastName: 'Mechta',
  email: 'soufiane.mechta@workadapt.demo',
  department: 'Ingénierie',
  jobTitle: 'Développeur serveur',
  domain: 'DEV',
  seniority: 'CONFIRMED',
  tools: ['VS Code', 'Docker', 'Git', 'Postman', 'IntelliJ', 'Jira'],
  projects: ['API de facturation', 'Migration vers conteneurs', 'Refonte de la chaîne de livraison'],
  objectives: [
    'Maîtriser la conteneurisation pour les mises en production',
    'Automatiser les livraisons de l’équipe',
    'Devenir référent technique sur mon domaine',
  ],
  weeklyHours: 6,
  preferences: ['PRACTICAL', 'MULTIMEDIA', 'PROJECT'],
  consent: {
    collect: true,
    shareWithSupervisor: true,
    at: day(-95),
  },
  cv: {
    fileName: 'CV_Soufiane_Mechta.pdf',
    uploadedAt: day(-95),
    experiences: [
      'Développeur serveur — 4 ans (API Java/Spring Boot)',
      'Développeur full-stack — 2 ans (Angular / Node.js)',
    ],
    skills: ['Java', 'Spring Boot', 'Angular', 'SQL', 'Git'],
    tools: ['Docker', 'IntelliJ', 'Postman', 'GitHub Actions'],
    certifications: ['AWS Cloud Practitioner (2023)'],
    projects: ['API de facturation', 'Portail client Angular'],
  },
  pastTrainings: [
    { id: 'pt-1', title: 'Spring Boot avancé', provider: 'Interne', year: 2024, completed: true, certificate: 'INT-2024-014' },
    { id: 'pt-2', title: 'Fondamentaux de Git', provider: 'Interne', year: 2023, completed: true },
  ],
  updatedAt: day(-12),
};

export const PAST_TRAININGS: PastTraining[] = INITIAL_PROFILE.pastTrainings;

/* ------------------------------------------------------------------ *
 * Compétences et preuves
 * ------------------------------------------------------------------ */

function evidence(
  id: string,
  at: string,
  source: EvidenceRef['source'],
  statement: string,
  observed: boolean,
  confidence: number,
): EvidenceRef {
  return { id, at, source, statement, observed, confidence };
}

/**
 * Associe un jeu de données de démonstration à son propriétaire tout en
 * conservant le type contextuel des champs métier (statuts, priorités,
 * sources…). Cette isolation est structurelle : aucun jeu partagé ne peut
 * être ajouté à un espace employé sans identifiant explicite.
 */
function owned<T extends { employeeId: string }>(
  employeeId: string,
  items: Omit<T, 'employeeId'>[],
): T[] {
  return items.map((item) => ({ ...item, employeeId }) as T);
}

export const INITIAL_SKILLS: SkillEstimate[] = owned<SkillEstimate>('emp-0001', [
  {
    code: 'docker',
    label: 'Docker',
    category: 'Infrastructure',
    level: 45,
    target: 80,
    confidence: 0.72,
    trend: 3,
    source: 'OBSERVED',
    evidence: [
      evidence('ev-d1', day(-1), 'COLLECTOR', 'Docker Desktop actif 2 h 40 sur les 7 derniers jours.', true, 0.9),
      evidence('ev-d2', day(-4), 'CONNECTED_APP', '3 fichiers Dockerfile modifiés dans le dépôt api-facturation.', true, 0.85),
      evidence('ev-d3', day(-9), 'INTERVIEW', 'Déclare savoir « lancer des conteneurs » mais pas optimiser une image.', false, 0.6),
    ],
    lastAssessed: day(-40),
    updatedAt: day(-1),
  },
  {
    code: 'cicd',
    label: 'CI/CD',
    category: 'Industrialisation',
    level: 25,
    target: 70,
    confidence: 0.66,
    trend: 1,
    source: 'OBSERVED',
    evidence: [
      evidence('ev-c1', day(-2), 'CONNECTED_APP', 'Deux exécutions de chaîne d’intégration en échec consultées sur GitHub Actions.', true, 0.8),
      evidence('ev-c2', day(-6), 'COLLECTOR', 'Aucune session sur un outil d’intégration continue cette semaine.', true, 0.55),
      evidence('ev-c3', day(-8), 'INTERVIEW', 'Objectif déclaré : automatiser les livraisons de l’équipe.', false, 0.7),
    ],
    updatedAt: day(-2),
  },
  {
    code: 'kubernetes',
    label: 'Kubernetes',
    category: 'Infrastructure',
    level: 30,
    target: 65,
    confidence: 0.58,
    trend: 0,
    source: 'DECLARED',
    evidence: [
      evidence('ev-k1', day(-15), 'CV', 'Mentionne Kubernetes dans les compétences, sans projet détaillé.', false, 0.45),
      evidence('ev-k2', day(-3), 'INTERVIEW', 'Déclare avoir « lu la documentation » sans pratique réelle.', false, 0.5),
    ],
    updatedAt: day(-3),
  },
  {
    code: 'tests',
    label: 'Tests automatisés',
    category: 'Qualité',
    level: 55,
    target: 75,
    confidence: 0.81,
    trend: 2,
    source: 'OBSERVED',
    evidence: [
      evidence('ev-t1', day(-1), 'CONNECTED_APP', '18 commits contenant des tests unitaires sur 30 jours.', true, 0.9),
      evidence('ev-t2', day(-5), 'COLLECTOR', 'IntelliJ avec couverture de tests ouverte 1 h 20.', true, 0.75),
    ],
    updatedAt: day(-1),
  },
  {
    code: 'angular',
    label: 'Angular',
    category: 'Interfaces',
    level: 40,
    target: 70,
    confidence: 0.69,
    trend: -1,
    source: 'OBSERVED',
    evidence: [
      evidence('ev-a1', day(-11), 'COLLECTOR', 'VS Code actif sur le dépôt portail-client 3 h cette semaine.', true, 0.8),
      evidence('ev-a2', day(-20), 'CV', 'Expérience full-stack Angular 2 ans.', false, 0.6),
    ],
    updatedAt: day(-11),
  },
  {
    code: 'git',
    label: 'Git',
    category: 'Collaboration',
    level: 70,
    target: 75,
    confidence: 0.88,
    trend: 1,
    source: 'OBSERVED',
    evidence: [
      evidence('ev-g1', day(-1), 'CONNECTED_APP', '42 commits et 9 pull requests sur 30 jours.', true, 0.95),
      evidence('ev-g2', day(-7), 'INTERVIEW', 'Déclare maîtriser les branches et les revues.', false, 0.7),
    ],
    updatedAt: day(-1),
  },
]);

export const INITIAL_SKILL_HISTORY: SkillHistoryEntry[] = owned<SkillHistoryEntry>('emp-0001', [
  {
    id: 'hist-1',
    at: day(-40),
    skillCode: 'docker',
    skill: 'Docker',
    previousLevel: 40,
    newLevel: 45,
    cause: 'ACTIVITE_OBSERVEE',
    evidenceIds: ['ev-d2'],
    confidence: 0.72,
  },
  {
    id: 'hist-2',
    at: day(-30),
    skillCode: 'tests',
    skill: 'Tests automatisés',
    previousLevel: 48,
    newLevel: 55,
    cause: 'ACTIVITE_OBSERVEE',
    evidenceIds: ['ev-t1'],
    confidence: 0.81,
  },
  {
    id: 'hist-3',
    at: day(-20),
    skillCode: 'git',
    skill: 'Git',
    previousLevel: 68,
    newLevel: 70,
    cause: 'FORMATION',
    evidenceIds: ['ev-g1'],
    confidence: 0.88,
  },
]);

export const INITIAL_GAPS: SkillGap[] = owned<SkillGap>('emp-0001', [
  {
    id: 'gap-emp-0001-docker',
    skillCode: 'docker',
    skillLabel: 'Docker',
    currentLevel: 45,
    targetLevel: 80,
    gap: 35,
    priority: 'HIGH',
    confidence: 0.72,
    observedFacts: [
      evidence('gf-d1', day(-1), 'COLLECTOR', 'Docker Desktop utilisé 2 h 40 sur 7 jours.', true, 0.9),
      evidence('gf-d2', day(-4), 'CONNECTED_APP', 'Dockerfile modifié sans construction multi-étapes.', true, 0.85),
      evidence('gf-d3', day(-1), 'CONNECTED_APP', 'Deux déploiements manuels successifs sur l’API.', true, 0.8),
    ],
    inference:
      'L’usage régulier de Docker sans optimisation d’image ni automatisation suggère une maîtrise partielle : les gestes de base sont là, la fiabilité industrielle ne l’est pas.',
    sources: ['OBSERVED', 'DECLARED'],
    recommendedFormats: ['PRACTICAL', 'PROJECT', 'SIMULATION', 'MULTIMEDIA'],
    status: 'NOUVEAU',
    detectedAt: day(-1),
  },
  {
    id: 'gap-emp-0001-cicd',
    skillCode: 'cicd',
    skillLabel: 'CI/CD',
    currentLevel: 25,
    targetLevel: 70,
    gap: 45,
    priority: 'HIGH',
    confidence: 0.66,
    observedFacts: [
      evidence('gf-c1', day(-2), 'CONNECTED_APP', 'Deux chaînes d’intégration en échec consultées sans correction.', true, 0.8),
      evidence('gf-c2', day(-6), 'COLLECTOR', 'Aucune session sur un outil d’intégration continue.', true, 0.55),
    ],
    inference:
      'La compétence est surtout déclarative : peu de pratique observée, échecs de chaîne d’intégration non traités. Le niveau réel est probablement inférieur au niveau déclaré.',
    sources: ['OBSERVED', 'DECLARED'],
    recommendedFormats: ['PRACTICAL', 'SIMULATION', 'PROJECT', 'MULTIMEDIA'],
    status: 'NOUVEAU',
    detectedAt: day(-2),
  },
  {
    id: 'gap-emp-0001-kubernetes',
    skillCode: 'kubernetes',
    skillLabel: 'Kubernetes',
    currentLevel: 30,
    targetLevel: 65,
    gap: 35,
    priority: 'MEDIUM',
    confidence: 0.58,
    observedFacts: [
      evidence('gf-k1', day(-15), 'CV', 'Compétence déclarée sans projet associé.', false, 0.45),
      evidence('gf-k2', day(-3), 'INTERVIEW', 'Aucune pratique réelle mentionnée.', false, 0.5),
    ],
    inference:
      'Compétence déclarée non vérifiée : aucun usage observé. Une évaluation pratique serait nécessaire avant de conclure à une lacune réelle.',
    sources: ['DECLARED'],
    recommendedFormats: ['SIMULATION', 'PRACTICAL', 'PROJECT'],
    status: 'EN_ATTENTE',
    detectedAt: day(-3),
    queueNote: 'Détecté pendant une autre formation — actionnable après le cycle en cours.',
  },
  {
    id: 'gap-emp-0001-angular',
    skillCode: 'angular',
    skillLabel: 'Angular',
    currentLevel: 40,
    targetLevel: 70,
    gap: 30,
    priority: 'MEDIUM',
    confidence: 0.69,
    observedFacts: [
      evidence('gf-a1', day(-11), 'COLLECTOR', 'VS Code sur portail-client 3 h cette semaine.', true, 0.8),
    ],
    inference:
      'Usage réel mais limité et en baisse. Le niveau cible du poste n’est pas atteint, sans urgence immédiate.',
    sources: ['OBSERVED', 'DECLARED'],
    recommendedFormats: ['PROJECT', 'MULTIMEDIA', 'INTERACTIVE'],
    status: 'RECONNU',
    detectedAt: day(-11),
  },
]);

/* ------------------------------------------------------------------ *
 * Sources de collecte
 * ------------------------------------------------------------------ */

export const DATA_SOURCES: DataSource[] = owned<DataSource>('emp-0001', [
  { code: 'CV', label: 'CV importé', description: 'Parcours, expériences et compétences déclarées.', status: 'CONNECTED', lastSync: day(-95), records: 1 },
  { code: 'INTERVIEW', label: 'Entretien IA', description: 'Réponses au diagnostic conversationnel.', status: 'CONNECTED', lastSync: day(-95), records: 24 },
  { code: 'COLLECTOR', label: 'Collecteur local', description: 'Applications actives, durées et fréquences.', status: 'CONNECTED', lastSync: day(0), records: 8421 },
  { code: 'CONNECTED_APP', label: 'GitHub / GitLab', description: 'Dépôts, commits et pull requests autorisés.', status: 'CONNECTED', lastSync: day(0), records: 312 },
  { code: 'PAST_TRAINING', label: 'Formations antérieures', description: 'Formations suivies et certifications obtenues.', status: 'PARTIAL', lastSync: day(-30), records: 2 },
  { code: 'TRAINING_COMPLETION', label: 'Formations WorkAdapt', description: 'Parcours terminés et preuves produites.', status: 'CONNECTED', lastSync: day(-1), records: 3 },
  { code: 'EVALUATION_RESULT', label: 'Résultats d’évaluation', description: 'Scores et critères validés.', status: 'CONNECTED', lastSync: day(-1), records: 1 },
  { code: 'TECH_WATCH', label: 'Veille technologique', description: 'Technologies et compétences émergentes.', status: 'CONNECTED', lastSync: day(0), records: 12 },
]);

/* ------------------------------------------------------------------ *
 * Catalogue des 7 formats
 * ------------------------------------------------------------------ */

export const TRAINING_FORMAT_CATALOG: TrainingFormatInfo[] = [
  {
    code: 'MULTIMEDIA',
    label: 'Multimédia',
    tagline: 'Comprendre en profondeur',
    unitLabel: 'Épisode',
    presentation:
      'Apprendre par des vidéos, articles, podcasts et documentation technique, avec des notes guidées.',
    howItWorks: [
      'Chaque épisode combine une vidéo, un article de référence et un podcast',
      'L’employé rédige des notes structurées après chaque épisode',
      'Un dossier de synthèse et une carte conceptuelle sont produits à la fin',
      'Aucun quiz final : la preuve est la restitution écrite',
    ],
    aiRole: [
      'Sélectionner et ordonner les ressources',
      'Résumer et expliquer les notions difficiles',
      'Adapter les exemples au poste réel',
    ],
    example: 'Docker : 10 épisodes sur les images, les volumes, les réseaux et Compose.',
    proof: 'Dossier de synthèse + restitution',
    icon: 'play_circle',
    accent: 'blue',
    typicalHours: '6 à 12 h',
    recommendedFor: ['Écart théorique', 'Découverte d’une technologie', 'Besoin de vision d’ensemble'],
  },
  {
    code: 'INTERACTIVE',
    label: 'Interactive',
    tagline: 'Ancrer par la répétition',
    unitLabel: 'Deck de drills',
    presentation:
      'Renforcer la mémoire par des cartes, des séries de questions et de la répétition espacée.',
    howItWorks: [
      'Chaque deck cible une notion précise',
      'Séries de questions corrigées immédiatement',
      'Les notions échouées reviennent à J+1, J+3 et J+7',
      'La maîtrise est validée par un seuil sur plusieurs sessions',
    ],
    aiRole: [
      'Générer les questions selon le contenu étudié',
      'Adapter la difficulté',
      'Identifier les notions à réviser',
    ],
    example: 'Angular : decks sur les signaux, les formulaires et les guards.',
    proof: 'Maîtrise ≥ 80 % sur plusieurs sessions espacées',
    icon: 'style',
    accent: 'violet',
    typicalHours: '8 à 14 h',
    recommendedFor: ['Mémorisation', 'Préparation d’examen', 'Notions nombreuses'],
  },
  {
    code: 'PRACTICAL',
    label: 'Pratique',
    tagline: 'Faire pour prouver',
    unitLabel: 'Lab',
    presentation: 'Exécuter des tâches réelles dans un environnement contrôlé, avec critères vérifiables.',
    howItWorks: [
      'Chaque lab a un brief, un environnement et des critères',
      'Indices disponibles, solution jamais donnée immédiatement',
      'Le résultat est vérifié, pas la théorie',
      'Une tâche finale sans aide clôture le parcours',
    ],
    aiRole: [
      'Générer des exercices adaptés',
      'Fournir des indices progressifs',
      'Analyser le résultat selon les critères',
    ],
    example: 'Docker : créer un Dockerfile, construire une image, la lancer, la diagnostiquer.',
    proof: 'Ateliers validés + tâche finale',
    icon: 'terminal',
    accent: 'teal',
    typicalHours: '10 à 18 h',
    recommendedFor: ['Écart technique', 'Gestes à automatiser', 'Vérification d’application'],
  },
  {
    code: 'PROJECT',
    label: 'Projet',
    tagline: 'Construire de bout en bout',
    unitLabel: 'Jalon',
    presentation: 'Réaliser un projet réel découpé en jalons avec livrables intermédiaires.',
    howItWorks: [
      'Un projet proche de l’activité réelle',
      'Chaque jalon produit un livrable vérifiable',
      'Revue par critères à chaque étape',
      'Livrable final accepté selon une rubrique',
    ],
    aiRole: [
      'Proposer un projet adapté',
      'Découper en jalons',
      'Analyser les livrables et conseiller',
    ],
    example: 'CI/CD : mettre en place une chaîne d’intégration complète pour une application existante.',
    proof: 'Projet final accepté selon rubrique',
    icon: 'account_tree',
    accent: 'amber',
    typicalHours: '15 à 24 h',
    recommendedFor: ['Compétence composite', 'Autonomie', 'Mise en situation longue'],
  },
  {
    code: 'SIMULATION',
    label: 'Simulation',
    tagline: 'Décider sous contrainte',
    unitLabel: 'Scénario',
    presentation: 'Résoudre des incidents réalistes dans un environnement virtuel, avec conséquences immédiates.',
    howItWorks: [
      'Chaque scénario présente une situation dégradée',
      'L’employé enquête, décide et observe les conséquences',
      'Le journal de décisions est évalué',
      'Un débrief clôture chaque scénario',
    ],
    aiRole: [
      'Créer des scénarios réalistes',
      'Adapter la difficulté',
      'Analyser les décisions et expliquer',
    ],
    example: 'Kubernetes : pod en CrashLoopBackOff, service indisponible, diagnostic guidé.',
    proof: 'Scénarios résolus + débrief',
    icon: 'sim_card',
    accent: 'rose',
    typicalHours: '8 à 16 h',
    recommendedFor: ['Diagnostic', 'Gestion d’incident', 'Décision sous pression'],
  },
  {
    code: 'AI_TUTORED',
    label: 'Tuteur IA',
    tagline: 'Comprendre par le dialogue',
    unitLabel: 'Session',
    presentation: 'Dialoguer avec un tuteur socratique qui adapte ses explications et vérifie la compréhension.',
    howItWorks: [
      'Chaque session part de ce que l’employé sait déjà',
      'Le tuteur explique à trois niveaux différents',
      'Des exercices sont générés selon les difficultés',
      'Un teach-back final valide la compréhension réelle',
    ],
    aiRole: [
      'Répondre aux questions',
      'Reformuler et donner des exemples',
      'Générer des exercices personnalisés',
    ],
    example: 'Docker : comprendre pourquoi le cache de couches fonctionne.',
    proof: 'Explication + exercice nouveau réussi',
    icon: 'forum',
    accent: 'green',
    typicalHours: '6 à 12 h',
    recommendedFor: ['Notion difficile', 'Blocage récurrent', 'Besoin d’explications multiples'],
  },
  {
    code: 'COLLABORATIVE',
    label: 'Collaboratif',
    tagline: 'Apprendre avec les autres',
    unitLabel: 'Sprint d’équipe',
    presentation: 'Travailler en équipe sur un livrable commun, avec rôles, revues et contribution individuelle.',
    howItWorks: [
      'Un livrable d’équipe sert de fil rouge',
      'Les rôles tournent à chaque sprint',
      'Chaque contribution individuelle est traçable',
      'Les pairs évaluent selon des critères explicites',
    ],
    aiRole: [
      'Constituer les groupes',
      'Répartir les rôles',
      'Faciliter les revues et identifier les acquis',
    ],
    example: 'Projet commun : trois employés livrent une application complète.',
    proof: 'Livrable d’équipe + contribution individuelle + revues',
    icon: 'groups',
    accent: 'slate',
    typicalHours: '12 à 24 h',
    recommendedFor: ['Compétence collective', 'Communication', 'Revue par les pairs'],
  },
];

/* ------------------------------------------------------------------ *
 * Notifications initiales
 * ------------------------------------------------------------------ */

export const INITIAL_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'ntf-1',
    type: 'GAP_DETECTED',
    title: 'Nouvel écart détecté : Docker',
    message: 'Votre usage de Docker progresse, mais l’optimisation d’image et la fiabilité de livraison restent en dessous du niveau attendu (45 / 80).',
    at: day(-1),
    read: false,
    link: '/app/ecarts/gap-emp-0001-docker',
    audience: ['EMPLOYEE'],
    employeeId: 'emp-0001',
  },
  {
    id: 'ntf-2',
    type: 'GAP_DETECTED',
    title: 'Nouvel écart détecté : CI/CD',
    message: 'Deux chaînes d’intégration en échec n’ont pas été traitées. Le niveau attendu pour votre poste est de 70.',
    at: day(-2),
    read: false,
    link: '/app/ecarts/gap-emp-0001-cicd',
    audience: ['EMPLOYEE'],
    employeeId: 'emp-0001',
  },
  {
    id: 'ntf-3',
    type: 'GAP_QUEUED',
    title: '1 écart mis en attente',
    message: 'Kubernetes est en attente : il deviendra actionnable après la fin de votre formation en cours.',
    at: day(-3),
    read: true,
    link: '/app/ecarts/gap-emp-0001-kubernetes',
    audience: ['EMPLOYEE'],
    employeeId: 'emp-0001',
  },
  {
    id: 'ntf-4',
    type: 'TRAINING_COMPLETED',
    title: 'Formation terminée dans votre équipe',
    message: 'Salma Ait Ali a terminé son parcours « SQL analytique ». Résultats disponibles.',
    at: day(-4),
    read: true,
    link: '/app/suivi-formations',
    audience: ['MANAGER'],
  },
];

/* ------------------------------------------------------------------ *
 * Certificats, historique, audit
 * ------------------------------------------------------------------ */

export const INITIAL_CERTIFICATES: Certificate[] = [
  {
    id: 'WA-2025-000241',
    requestId: 'req-archive-1',
    trainingId: 'prg-archive-1',
    evaluationId: 'eval-archive-1',
    employeeId: 'emp-0001',
    employeeName: 'Soufiane Mechta',
    formationTitle: 'Git — travail collaboratif',
    skillLabel: 'Git',
    method: 'KNOWLEDGE_TEST',
    score: 84,
    levelBefore: 62,
    levelAfter: 70,
    criteriaValidated: ['Test de connaissances ≥ 75', 'Toutes les unités terminées', 'Livrable final validé'],
    issuedAt: dateOnly(-20),
    format: 'INTERACTIVE',
  },
];

export const INITIAL_AUDIT: AuditEntry[] = [
  { id: 'aud-1', at: day(-1), actor: 'Agent d’analyse des compétences', action: 'Détection d’écart', target: 'gap-emp-0001-docker', detail: 'Écart Docker 45 → 80, confiance 0,72', ip: '10.0.4.18' },
  { id: 'aud-2', at: day(-2), actor: 'Agent d’analyse des compétences', action: 'Détection d’écart', target: 'gap-cicd', detail: 'Écart CI/CD 25 → 70, confiance 0,66', ip: '10.0.4.18' },
  { id: 'aud-3', at: day(-3), actor: 'Orchestrateur', action: 'Mise en attente', target: 'gap-kubernetes', detail: 'Écart différé pendant une formation active', ip: '10.0.4.10' },
  { id: 'aud-4', at: day(-20), actor: 'Ahmed El Fellah', action: 'Validation de parcours', target: 'req-archive-1', detail: 'Parcours Git approuvé après revue complète', ip: '10.0.8.22' },
];

/* ------------------------------------------------------------------ *
 * Équipe et suivi
 * ------------------------------------------------------------------ */

export const INITIAL_TEAM: TeamMember[] = [
  {
    id: 'emp-0001',
    name: 'Soufiane Mechta',
    email: 'soufiane.mechta@workadapt.demo',
    role: 'EMPLOYEE',
    jobTitle: 'Développeur serveur',
    department: 'Ingénierie',
    status: 'ACTIVE',
    skillsTracked: 6,
    averageLevel: 55,
    certifications: 1,
    formationProgress: 0,
    skills: INITIAL_SKILLS.map((skill) => ({
      code: skill.code,
      label: skill.label,
      level: skill.level,
      target: skill.target,
      confidence: skill.confidence,
      source: skill.source,
    })),
    lastActivityAt: day(0),
  },
  {
    id: 'emp-0002',
    name: 'Salma Ait Ali',
    email: 'salma.aitali@workadapt.demo',
    role: 'EMPLOYEE',
    jobTitle: 'Analyste data',
    department: 'Data',
    status: 'ACTIVE',
    skillsTracked: 5,
    averageLevel: 68,
    certifications: 2,
    activeFormation: 'SQL analytique — parcours pratique',
    formationProgress: 72,
    lastEvaluation: { method: 'TECHNICAL_CHALLENGE', score: 81, decision: 'REUSSI', at: dateOnly(-4) },
    lastActivityAt: day(-1),
  },
  {
    id: 'emp-0003',
    name: 'Youssef Amrani',
    email: 'youssef.amrani@workadapt.demo',
    role: 'EMPLOYEE',
    jobTitle: 'Ingénieur qualité',
    department: 'Qualité',
    status: 'ACTIVE',
    skillsTracked: 4,
    averageLevel: 61,
    certifications: 1,
    activeFormation: 'Audit interne — parcours projet',
    formationProgress: 35,
    lastEvaluation: { method: 'CASE_ANALYSIS', score: 68, decision: 'ECHOUE', at: dateOnly(-9) },
    lastActivityAt: day(-2),
  },
  {
    id: 'emp-0004',
    name: 'Nadia Bennis',
    email: 'nadia.bennis@workadapt.demo',
    role: 'EMPLOYEE',
    jobTitle: 'Responsable e-commerce',
    department: 'E-commerce',
    status: 'ACTIVE',
    skillsTracked: 5,
    averageLevel: 59,
    certifications: 0,
    formationProgress: 0,
    lastActivityAt: day(-6),
  },
];

/* ------------------------------------------------------------------ *
 * Veille technologique
 * ------------------------------------------------------------------ */

export const INITIAL_TECH_SIGNALS: TechSignal[] = owned<TechSignal>('emp-0001', [
  {
    id: 'tw-1',
    technology: 'Dev Containers',
    category: 'Environnement de développement',
    skillCode: 'docker',
    skillLabel: 'Docker',
    maturity: 'ADOPTION',
    relevance: 'HAUTE',
    why: 'Standardise les environnements de développement et réduit les écarts de configuration dans l’équipe.',
    source: 'Veille interne · documentation éditeur',
    at: day(-2),
    suggestedAction: 'Ajouter un lab « environnement reproductible » au parcours Docker.',
  },
  {
    id: 'tw-2',
    technology: 'OpenTelemetry',
    category: 'Observabilité',
    skillCode: 'cicd',
    skillLabel: 'CI/CD',
    maturity: 'ADOPTION',
    relevance: 'HAUTE',
    why: 'Relie les chaînes d’intégration et la production avec des traces communes.',
    source: 'Veille interne · communauté open source',
    at: day(-3),
    suggestedAction: 'Proposer une découverte guidée avant un parcours projet.',
  },
  {
    id: 'tw-3',
    technology: 'Sigstore / cosign',
    category: 'Sécurité de la chaîne logicielle',
    skillCode: 'docker',
    skillLabel: 'Docker',
    maturity: 'EMERGENTE',
    relevance: 'MOYENNE',
    why: 'Signature des images et vérification d’intégrité à la publication.',
    source: 'Veille interne · spécifications',
    at: day(-5),
    suggestedAction: 'Surveiller : pas encore prioritaire pour le poste.',
  },
  {
    id: 'tw-4',
    technology: 'Angular signals avancés',
    category: 'Interfaces',
    skillCode: 'angular',
    skillLabel: 'Angular',
    maturity: 'ADOPTION',
    relevance: 'MOYENNE',
    why: 'Simplifie la gestion d’état et réduit les recalculs.',
    source: 'Veille interne · notes de version',
    at: day(-6),
    suggestedAction: 'Mettre à jour le parcours Angular interactif.',
  },
  {
    id: 'tw-5',
    technology: 'Tests basés sur les propriétés',
    category: 'Qualité logicielle',
    skillCode: 'tests',
    skillLabel: 'Tests automatisés',
    maturity: 'EMERGENTE',
    relevance: 'MOYENNE',
    why: 'Détecte des cas limites que les exemples manuels oublient.',
    source: 'Veille interne · publications techniques',
    at: day(-8),
    suggestedAction: 'Ajouter un deck de drills dédié.',
  },
]);

/* ------------------------------------------------------------------ *
 * Pilotage : KPI du CDC §3.3
 * ------------------------------------------------------------------ */

export const KPIS: Kpi[] = [
  { code: 'COLLECT_COVERAGE', label: 'Couverture de collecte', definition: 'Événements collectés correctement ÷ événements attendus', target: 95, current: 96, unit: 'PERCENT', direction: 'UP' },
  { code: 'SKILL_PRECISION', label: 'Précision d’identification des compétences', definition: 'Compétences correctement identifiées ÷ compétences évaluées', target: 80, current: 82, unit: 'PERCENT', direction: 'UP' },
  { code: 'GAP_RELEVANCE', label: 'Pertinence des écarts', definition: 'Écarts jugés pertinents ÷ écarts évalués', target: 80, current: 84, unit: 'PERCENT', direction: 'UP' },
  { code: 'RECO_RELEVANCE', label: 'Pertinence des recommandations', definition: 'Recommandations jugées pertinentes ÷ recommandations évaluées', target: 80, current: 81, unit: 'PERCENT', direction: 'UP' },
  { code: 'GENERATION_TIME', label: 'Temps de génération d’un parcours', definition: 'Entre détection de l’écart et parcours disponible', target: 10, current: 4, unit: 'MINUTES', direction: 'DOWN' },
  { code: 'APPROVAL_RATE', label: 'Taux d’approbation', definition: 'Parcours approuvés ÷ parcours soumis', target: 70, current: 78, unit: 'PERCENT', direction: 'UP' },
  { code: 'COMPLETION_RATE', label: 'Taux de complétion', definition: 'Formations terminées ÷ formations approuvées', target: 70, current: 64, unit: 'PERCENT', direction: 'UP' },
  { code: 'EVAL_SUCCESS', label: 'Taux de réussite aux évaluations', definition: 'Évaluations réussies ÷ évaluations réalisées', target: 75, current: 71, unit: 'PERCENT', direction: 'UP' },
  { code: 'SKILL_GAIN', label: 'Amélioration des compétences', definition: 'Niveau après formation − niveau avant', target: 15, current: 17, unit: 'POINTS', direction: 'UP' },
  { code: 'GAP_REDUCTION', label: 'Réduction des écarts', definition: '(Écart initial − écart final) ÷ écart initial', target: 30, current: 34, unit: 'PERCENT', direction: 'UP' },
  { code: 'LOOP_COMPLETION', label: 'Taux de boucles terminées', definition: 'Boucles complètes ÷ boucles commencées', target: 60, current: 58, unit: 'PERCENT', direction: 'UP' },
  { code: 'WORKFLOW_SUCCESS', label: 'Taux de réussite des flux de travail', definition: 'Flux de travail sans erreur bloquante ÷ flux de travail lancés', target: 90, current: 92, unit: 'PERCENT', direction: 'UP' },
  { code: 'API_LATENCY', label: 'Temps de réponse API', definition: 'Opérations standards', target: 2, current: 1.4, unit: 'SECONDS', direction: 'DOWN' },
];

/* ------------------------------------------------------------------ *
 * Besoins, tendances, rapports
 * ------------------------------------------------------------------ */

export const TRAINING_NEEDS: TrainingNeed[] = [
  { id: 'need-1', skill: 'CI/CD', department: 'Ingénierie', employeesConcerned: 7, averageGap: 38, priority: 'HIGH', recommendedFormats: ['PRACTICAL', 'PROJECT'], trend: 6 },
  { id: 'need-2', skill: 'Docker', department: 'Ingénierie', employeesConcerned: 5, averageGap: 31, priority: 'HIGH', recommendedFormats: ['PRACTICAL', 'SIMULATION'], trend: 4 },
  { id: 'need-3', skill: 'Tests automatisés', department: 'Qualité', employeesConcerned: 4, averageGap: 22, priority: 'MEDIUM', recommendedFormats: ['INTERACTIVE', 'PRACTICAL'], trend: 2 },
  { id: 'need-4', skill: 'Angular', department: 'Ingénierie', employeesConcerned: 3, averageGap: 25, priority: 'MEDIUM', recommendedFormats: ['PROJECT', 'MULTIMEDIA'], trend: -1 },
];

export const SKILL_TRENDS: SkillTrendSeries[] = [
  {
    skill: 'Docker',
    points: [
      { month: 'Juin', level: 38 },
      { month: 'Juillet', level: 40 },
      { month: 'Août', level: 41 },
      { month: 'Septembre', level: 43 },
      { month: 'Octobre', level: 44 },
      { month: 'Novembre', level: 45 },
    ],
  },
  {
    skill: 'CI/CD',
    points: [
      { month: 'Juin', level: 18 },
      { month: 'Juillet', level: 19 },
      { month: 'Août', level: 21 },
      { month: 'Septembre', level: 22 },
      { month: 'Octobre', level: 24 },
      { month: 'Novembre', level: 25 },
    ],
  },
  {
    skill: 'Tests automatisés',
    points: [
      { month: 'Juin', level: 42 },
      { month: 'Juillet', level: 45 },
      { month: 'Août', level: 48 },
      { month: 'Septembre', level: 50 },
      { month: 'Octobre', level: 53 },
      { month: 'Novembre', level: 55 },
    ],
  },
];

export const REPORT_EXPORTS: ReportExport[] = [
  { id: 'rpt-1', title: 'Besoins de formation agrégés', period: 'Septembre — Novembre 2026', scope: 'Tous départements', format: 'CSV', generatedAt: dateOnly(-7), records: 4 },
  { id: 'rpt-2', title: 'Synthèse des KPI', period: 'Novembre 2026', scope: 'Organisation', format: 'PDF', generatedAt: dateOnly(-3), records: 13 },
];

/* ------------------------------------------------------------------ *
 * Agents (CDC §8.2) et workflows
 * ------------------------------------------------------------------ */

export const AGENTS: AgentStatus[] = [
  { code: 'ORCH', name: 'Orchestrateur', mission: 'Coordonne l’ordre des étapes, gère les états et la reprise.', health: 'RUNNING', lastRun: day(0), durationMs: 240, successRate: 99 },
  { code: 'DATA_COLLECTION', name: 'Agent de collecte', mission: 'Organise les informations des six sources autorisées.', health: 'RUNNING', lastRun: day(0), durationMs: 1820, successRate: 96 },
  { code: 'SKILL_INTELLIGENCE', name: 'Agent d’analyse des compétences', mission: 'Identifie les compétences, estime les niveaux et détecte les écarts.', health: 'RUNNING', lastRun: day(0), durationMs: 2140, successRate: 94 },
  { code: 'TECHNOLOGY_WATCH', name: 'Agent de veille technologique', mission: 'Suit les technologies émergentes et leur pertinence par métier.', health: 'IDLE', lastRun: day(-2), durationMs: 960, successRate: 97 },
  { code: 'LEARNING_PLANNER', name: 'Agent de conception pédagogique', mission: 'Génère les parcours selon l’écart et le format choisi.', health: 'IDLE', lastRun: day(-1), durationMs: 3400, successRate: 91 },
  { code: 'SUPERVISOR_WORKFLOW', name: 'Agent de validation supervisée', mission: 'Organise la validation humaine et enregistre les décisions.', health: 'WAITING_APPROVAL', lastRun: day(-1), durationMs: 320, successRate: 100 },
  { code: 'TRAINING', name: 'Agent de formation', mission: 'Met à disposition les unités et suit la progression réelle.', health: 'IDLE', lastRun: day(-4), durationMs: 410, successRate: 98 },
  { code: 'ASSESSMENT_CERTIFICATION', name: 'Agent d’évaluation et de certification', mission: 'Évalue les acquis, produit le rapport et le certificat conditionnel.', health: 'IDLE', lastRun: day(-4), durationMs: 2860, successRate: 93 },
];

export const WORKFLOWS: WorkflowRun[] = [
  {
    id: 'wf-1',
    employee: 'Soufiane Mechta',
    label: 'Collecte quotidienne → détection d’écart',
    startedAt: day(0),
    status: 'COMPLETED',
    currentStep: 'Écart publié',
    steps: [
      { name: 'Collecte des événements', agent: 'DATA_COLLECTION', state: 'DONE', at: day(0), durationMs: 1820 },
      { name: 'Normalisation et déduplication', agent: 'DATA_COLLECTION', state: 'DONE', at: day(0), durationMs: 640 },
      { name: 'Estimation des compétences', agent: 'SKILL_INTELLIGENCE', state: 'DONE', at: day(0), durationMs: 2140 },
      { name: 'Détection d’écart', agent: 'SKILL_INTELLIGENCE', state: 'DONE', at: day(0), durationMs: 380 },
      { name: 'Notification employé', agent: 'ORCH', state: 'DONE', at: day(0), durationMs: 90 },
    ],
  },
  {
    id: 'wf-2',
    employee: 'Soufiane Mechta',
    label: 'Parcours Docker — attente de validation',
    startedAt: day(-1),
    status: 'WAITING_APPROVAL',
    currentStep: 'Validation superviseur',
    steps: [
      { name: 'Analyse de l’écart', agent: 'SKILL_INTELLIGENCE', state: 'DONE', at: day(-1), durationMs: 290 },
      { name: 'Choix du format', agent: 'LEARNING_PLANNER', state: 'DONE', at: day(-1), durationMs: 120 },
      { name: 'Génération du parcours pratique', agent: 'LEARNING_PLANNER', state: 'DONE', at: day(-1), durationMs: 3400 },
      { name: 'Transmission au superviseur', agent: 'SUPERVISOR_WORKFLOW', state: 'DONE', at: day(-1), durationMs: 320 },
      { name: 'Décision superviseur', agent: 'SUPERVISOR_WORKFLOW', state: 'RUNNING' },
    ],
  },
  {
    id: 'wf-3',
    employee: 'Salma Ait Ali',
    label: 'Parcours SQL — évaluation en cours',
    startedAt: day(-6),
    status: 'RUNNING',
    currentStep: 'Correction de l’épreuve technique',
    steps: [
      { name: 'Formation terminée', agent: 'TRAINING', state: 'DONE', at: day(-2), durationMs: 410 },
      { name: 'Choix de la méthode', agent: 'ASSESSMENT_CERTIFICATION', state: 'DONE', at: day(-1), durationMs: 90 },
      { name: 'Génération de l’épreuve technique', agent: 'ASSESSMENT_CERTIFICATION', state: 'DONE', at: day(-1), durationMs: 1600 },
      { name: 'Correction', agent: 'ASSESSMENT_CERTIFICATION', state: 'RUNNING' },
    ],
  },
];

export const AGENT_EXCHANGES: AgentExchange[] = [
  { id: 'ex-1', at: day(0), from: 'DATA_COLLECTION', to: 'SKILL_INTELLIGENCE', topic: 'Jeu d’événements normalisé (842 événements)', status: 'DELIVERED' },
  { id: 'ex-2', at: day(0), from: 'SKILL_INTELLIGENCE', to: 'ORCH', topic: 'Écart Docker 45 → 80, confiance 0,72', status: 'DELIVERED' },
  { id: 'ex-3', at: day(-1), from: 'LEARNING_PLANNER', to: 'SUPERVISOR_WORKFLOW', topic: 'Parcours pratique Docker (12 h, 8 ateliers)', status: 'DELIVERED' },
  { id: 'ex-4', at: day(-1), from: 'SUPERVISOR_WORKFLOW', to: 'ORCH', topic: 'En attente de décision humaine', status: 'PENDING' },
];

/* ------------------------------------------------------------------ *
 * Domaines proposés à l’inscription
 * ------------------------------------------------------------------ */

export const DOMAIN_OPTIONS: { value: Domain; label: string; example: string }[] = [
  { value: 'DEV', label: 'Développement logiciel', example: 'Développement serveur, interfaces, mobile, DevOps' },
  { value: 'DATA_AI', label: 'Data / IA', example: 'Data engineering, analyse, machine learning' },
  { value: 'ECOMMERCE', label: 'E-commerce', example: 'Acquisition, conversion, catalogue, logistique' },
  { value: 'AUDIT_QUALITY', label: 'Audit / Qualité', example: 'Audit interne, conformité, assurance qualité' },
  { value: 'MARKETING', label: 'Marketing', example: 'Contenu, campagnes, analytics marketing' },
  { value: 'RH', label: 'Ressources humaines', example: 'Recrutement, développement RH, paie' },
  { value: 'FINANCE', label: 'Finance', example: 'Contrôle de gestion, analyse financière' },
  { value: 'DESIGN', label: 'Design / UX', example: 'Recherche utilisateur, interface, accessibilité' },
  { value: 'OTHER', label: 'Autre', example: 'Précisez votre domaine dans le champ libre' },
];

/* ------------------------------------------------------------------ *
 * Collecte : événements et exécutions initiales
 * ------------------------------------------------------------------ */

export const INITIAL_COLLECTION_EVENTS: CollectionEvent[] = owned<CollectionEvent>('emp-0001', [
  {
    id: 'evt-0001',
    at: day(0),
    source: 'COLLECTOR',
    type: 'APP_USAGE',
    label: 'Docker Desktop — 2 h 40 cette semaine',
    detail: 'Sessions de travail sur des conteneurs locaux, sans construction multi-étapes observée.',
    skillCodes: ['docker'],
    observed: true,
    confidence: 0.9,
    proof: 'Journal du Collecteur local · 6 sessions',
  },
  {
    id: 'evt-0002',
    at: day(-1),
    source: 'CONNECTED_APP',
    type: 'PROJECT_ACTIVITY',
    label: 'API de facturation — 3 Dockerfile modifiés',
    detail: 'Modifications sans optimisation de couches ni utilisateur non root.',
    skillCodes: ['docker'],
    observed: true,
    confidence: 0.85,
    proof: 'GitHub · dépôt api-facturation · commits 4f2a, 9c1b',
  },
  {
    id: 'evt-0003',
    at: day(-2),
    source: 'CONNECTED_APP',
    type: 'PROJECT_ACTIVITY',
    label: 'Deux chaînes d’intégration en échec non traitées',
    detail: 'Exécutions GitHub Actions en échec, aucune correction associée.',
    skillCodes: ['cicd'],
    observed: true,
    confidence: 0.8,
    proof: 'GitHub Actions · runs 1182 et 1179',
  },
  {
    id: 'evt-0004',
    at: day(-1),
    source: 'COLLECTOR',
    type: 'APP_USAGE',
    label: 'IntelliJ — couverture de tests consultée 1 h 20',
    detail: 'Consultation du rapport de couverture après exécution des tests.',
    skillCodes: ['tests'],
    observed: true,
    confidence: 0.75,
    proof: 'Journal du Collecteur local · 2 sessions',
  },
  {
    id: 'evt-0005',
    at: day(-95),
    source: 'CV',
    type: 'PROFILE_UPDATE',
    label: 'CV importé — CV_Soufiane_Mechta.pdf',
    detail: '4 ans de développement serveur Java/Spring, expérience Angular 2 ans.',
    skillCodes: ['docker', 'angular', 'git'],
    observed: false,
    confidence: 0.6,
    proof: 'Extraction CV · 12 compétences détectées',
  },
  {
    id: 'evt-0006',
    at: day(-95),
    source: 'INTERVIEW',
    type: 'ASSESSMENT_DONE',
    label: 'Entretien IA — 24 réponses',
    detail:
      'Déclare savoir lancer des conteneurs, pas optimiser une image. Objectif : automatiser les livraisons.',
    skillCodes: ['docker', 'cicd', 'kubernetes'],
    observed: false,
    confidence: 0.7,
    proof: 'Transcription de l’entretien · diagnostic initial',
  },
  {
    id: 'evt-0007',
    at: day(-30),
    source: 'PAST_TRAINING',
    type: 'TRAINING_DONE',
    label: 'Formation antérieure — Spring Boot avancé',
    detail: 'Formation interne 2024 terminée, certificat INT-2024-014.',
    skillCodes: ['java'],
    observed: true,
    confidence: 0.8,
    proof: 'Registre de formation interne',
  },
]);

export const INITIAL_COLLECTION_RUNS: CollectionRun[] = owned<CollectionRun>('emp-0001', [
  {
    id: 'run-0001',
    kind: 'INITIAL',
    startedAt: day(-95),
    finishedAt: day(-95),
    eventsCount: 34,
    newGaps: 0,
    status: 'SUCCESS',
    sourcesUsed: ['CV', 'INTERVIEW', 'PAST_TRAINING'],
  },
  {
    id: 'run-0002',
    kind: 'DAILY',
    startedAt: day(0),
    finishedAt: day(0),
    eventsCount: 4,
    newGaps: 2,
    status: 'SUCCESS',
    sourcesUsed: ['COLLECTOR', 'CONNECTED_APP', 'TECH_WATCH'],
  },
  {
    id: 'run-0003',
    kind: 'DAILY',
    startedAt: day(-7),
    finishedAt: day(-7),
    eventsCount: 0,
    newGaps: 0,
    status: 'FAILED',
    error: 'Collecteur local injoignable (agent arrêté sur le poste).',
    sourcesUsed: ['COLLECTOR'],
  },
]);

/* ------------------------------------------------------------------ *
 * Demandes de formation initiales (parcours généré avant validation)
 * ------------------------------------------------------------------ */

export const INITIAL_TRAINING_REQUESTS: TrainingRequest[] = [
  {
    id: 'treq-0001',
    employeeId: 'emp-0001',
    employeeName: 'Soufiane Mechta',
    gapId: 'gap-emp-0001-docker',
    skillCode: 'docker',
    skillLabel: 'Docker',
    subject: 'Conteneurisation d’applications',
    objective:
      'Passer d’un usage occasionnel de Docker à une conteneurisation fiable : images optimisées, persistance, réseaux et publication automatisée.',
    domain: 'DEV',
    format: 'PRACTICAL',
    levelFrom: 45,
    levelTo: 80,
    status: 'PENDING',
    requestedAt: day(-1),
    trainingId: '',
    progressPercent: 0,
    origin: 'GAP',
  },
];
