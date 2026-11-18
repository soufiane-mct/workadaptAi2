import {
  CaseAnalysisDocument,
  DefenseInterviewDocument,
  EvaluationDocument,
  ExamQuestion,
  KnowledgeTestDocument,
  ProfessionalDossierDocument,
  TechnicalChallengeDocument,
  TrainingProgram,
} from '../../models';
import { knowledgeFor } from '../knowledge';

export interface TopicRef {
  title: string;
  objective: string;
  notions: string[];
}

/** Extrait les sujets réellement travaillés dans le programme suivi. */
export function programTopics(program: TrainingProgram): TopicRef[] {
  switch (program.format) {
    case 'MULTIMEDIA':
      return program.episodes.map((episode) => ({
        title: episode.title,
        objective: episode.objective,
        notions: episode.keyPoints,
      }));
    case 'INTERACTIVE':
      return program.drillSets.map((set) => ({
        title: set.title,
        objective: `Maîtriser ${set.notion}`,
        notions: set.cards.map((card) => card.back),
      }));
    case 'PRACTICAL':
      return program.labs.map((lab) => ({
        title: lab.title,
        objective: lab.brief,
        notions: lab.successCriteria,
      }));
    case 'PROJECT':
      return program.milestones.map((milestone) => ({
        title: milestone.title,
        objective: milestone.brief,
        notions: milestone.criteria,
      }));
    case 'SIMULATION':
      return program.scenarios.map((scenario) => ({
        title: scenario.title,
        objective: scenario.situation,
        notions: scenario.signals,
      }));
    case 'AI_TUTORED':
      return program.tutorSessions.map((session) => ({
        title: session.topic,
        objective: session.objective,
        notions: session.teachBack.keywords,
      }));
    case 'COLLABORATIVE':
      return program.sprints.map((sprint) => ({
        title: sprint.title,
        objective: sprint.teamGoal,
        notions: sprint.peerReviewCriteria,
      }));
    default:
      return [];
  }
}

function questionFromTopic(topic: TopicRef, index: number, prefix: string): ExamQuestion {
  const notion = topic.notions[0] ?? topic.title;
  return {
    id: `${prefix}-q${index + 1}`,
    type: index % 4 === 0 ? 'MULTI' : index % 4 === 1 ? 'SCENARIO' : index % 4 === 2 ? 'TRUE_FALSE' : 'TECHNICAL',
    prompt:
      index % 4 === 1
        ? `Situation : ${topic.objective} Quelle décision est la plus défendable ?`
        : index % 4 === 2
          ? `Affirmation : « ${notion} » suffit à garantir la maîtrise de ${topic.title}.`
          : `Dans « ${topic.title} », quel élément est central ?`,
    options:
      index % 4 === 2
        ? ['Vrai', 'Faux']
        : index % 4 === 3
          ? ['Réponse libre et argumentée']
          : [notion, 'Un élément sans lien avec l’objectif', 'Une option volontairement contraire', 'Une approximation fréquente'],
    correctIndexes: index % 4 === 2 ? [1] : index % 4 === 3 ? [] : [0],
    explanation: `Attendu : ${topic.objective} — notion clé : ${notion}.`,
    points: index % 4 === 3 ? 3 : 1,
    critical: index < 3,
  };
}

/** 1. TEST DE CONNAISSANCES — examen écrit, plusieurs sections, 24 questions. */
export function buildKnowledgeTest(program: TrainingProgram): KnowledgeTestDocument {
  const pack = knowledgeFor(program.skillCode, program.skillLabel, program.subject, program.domain);
  const topics = programTopics(program);
  const sections = [
    { title: 'Notions fondamentales', from: 0, to: 6 },
    { title: 'Application professionnelle', from: 6, to: 12 },
    { title: 'Diagnostic et erreurs fréquentes', from: 12, to: 18 },
    { title: 'Mises en situation', from: 18, to: 24 },
  ].map((section, sectionIndex) => ({
    id: `sec-${sectionIndex + 1}`,
    title: section.title,
    objective:
      sectionIndex === 0
        ? 'Vérifier les définitions et les mécanismes'
        : sectionIndex === 1
          ? 'Vérifier le passage à la pratique'
          : sectionIndex === 2
            ? 'Vérifier la capacité à repérer une erreur'
            : 'Vérifier le jugement en situation',
    questions: Array.from({ length: section.to - section.from }, (_, offset) => {
      const index = section.from + offset;
      if (sectionIndex === 0 && index < pack.exam.length) {
        const source = pack.exam[index];
        return {
          id: `kt-q${index + 1}`,
          type: source.type,
          prompt: source.prompt,
          options: source.options,
          correctIndexes: source.correctIndexes,
          explanation: source.explanation,
          points: 1,
          critical: index < 2,
        } satisfies ExamQuestion;
      }
      return questionFromTopic(topics[index % Math.max(1, topics.length)], index, 'kt');
    }),
  }));

  return {
    method: 'KNOWLEDGE_TEST',
    title: `Test de connaissances — ${program.title}`,
    instructions: [
      'Examen individuel, sans document externe.',
      'Les questions à choix multiples peuvent avoir plusieurs réponses.',
      'Les questions techniques demandent une réponse structurée : affirmation, justification, exemple.',
      'Toute réponse non justifiée sur une question technique ne rapporte aucun point.',
      'Seuil de réussite : défini par la formation (75/100 par défaut).',
    ],
    durationMinutes: 60,
    sections,
  };
}

/** 2. ÉPREUVE TECHNIQUE — 3 tâches exécutables, critères vérifiables. */
export function buildTechnicalChallenge(program: TrainingProgram): TechnicalChallengeDocument {
  const topics = programTopics(program);
  const labs = program.format === 'PRACTICAL' ? program.labs : [];

  const tasks = [0, 1, 2].map((index) => {
    const topic = topics[index % Math.max(1, topics.length)];
    const lab = labs[index];
    return {
      id: `tc-task-${index + 1}`,
      title: lab?.title ?? `Tâche ${index + 1} — ${topic?.title ?? program.skillLabel}`,
      brief:
        lab?.brief ??
        `Réalisez la tâche complète sur « ${topic?.title ?? program.subject} » sans aide, puis documentez vos décisions.`,
      environment: lab?.environment ?? 'Environnement technique simulé, accès aux outils habituels',
      deliverable: lab ? `Résultat du lab + journal des commandes` : 'Résultat vérifiable + journal des décisions',
      steps:
        lab?.steps ??
        [
          'Lire la consigne et reformuler le résultat attendu',
          'Réaliser la tâche de bout en bout',
          'Vérifier le résultat selon les critères',
          'Documenter les écarts et les décisions',
        ],
      successCriteria:
        lab?.successCriteria ??
        [
          'Le résultat attendu est produit',
          'La démarche est reproductible',
          'Les décisions sont justifiées',
        ],
      points: index === 2 ? 40 : 30,
      hint: `Indice : ${topic?.notions[0] ?? 'revenir à l’objectif de la formation'}`,
    };
  });

  return {
    method: 'TECHNICAL_CHALLENGE',
    title: `Épreuve technique — ${program.title}`,
    instructions: [
      'Épreuve chronométrée, individuelle.',
      'Les indices sont disponibles mais réduisent le score de la tâche.',
      'Chaque critère est vérifié ; un critère éliminatoire non satisfait invalide la tâche.',
      'Le journal des commandes et décisions fait partie de la preuve.',
      'Aucune aide externe non autorisée.',
    ],
    durationMinutes: 150,
    tasks,
  };
}

/** 3. ANALYSE DE CAS — dossier réaliste, diagnostic et justification. */
export function buildCaseAnalysis(program: TrainingProgram): CaseAnalysisDocument {
  const pack = knowledgeFor(program.skillCode, program.skillLabel, program.subject, program.domain);
  const topics = programTopics(program);

  const questions = [
    {
      prompt: 'Quels faits retenez-vous en premier ? Distinguez observation et interprétation.',
      guidance: 'Lister les faits, puis les hypothèses séparément.',
      expectedThemes: ['faits observés', 'hypothèses', 'données manquantes'],
      points: 15,
    },
    {
      prompt: 'Quel est le diagnostic le plus probable ? Justifiez par les signaux du dossier.',
      guidance: 'Une cause principale, deux causes écartées avec raison.',
      expectedThemes: ['cause principale', 'signaux concordants', 'hypothèses écartées'],
      points: 20,
    },
    {
      prompt: 'Quelles décisions prenez-vous à court terme ? Dans quel ordre ?',
      guidance: 'Prioriser par risque et réversibilité.',
      expectedThemes: ['priorisation', 'mesures immédiates', 'risques'],
      points: 20,
    },
    {
      prompt: 'Quel plan d’action structurel proposez-vous ?',
      guidance: 'Mesures, responsables, indicateurs.',
      expectedThemes: ['actions correctives', 'prévention', 'indicateurs'],
      points: 20,
    },
    {
      prompt: 'Quels risques votre plan introduit-il ? Comment les limitez-vous ?',
      guidance: 'Identifier au moins deux risques et leurs parades.',
      expectedThemes: ['risques', 'parades', 'réversibilité'],
      points: 15,
    },
    {
      prompt: 'Quelle information vous manque-t-il pour décider avec plus de certitude ?',
      guidance: 'Formuler la question à poser et à qui.',
      expectedThemes: ['données manquantes', 'source', 'décision conditionnelle'],
      points: 10,
    },
  ].map((question, index) => ({
    id: `ca-q${index + 1}`,
    ...question,
  }));

  return {
    method: 'CASE_ANALYSIS',
    title: `Analyse de cas — ${program.title}`,
    instructions: [
      'Documents autorisés : le dossier de cas uniquement.',
      'Chaque réponse doit distinguer les faits, les hypothèses et les décisions.',
      'Une réponse sans justification ne rapporte pas la totalité des points.',
      'La qualité du raisonnement prime sur la longueur.',
    ],
    durationMinutes: 90,
    caseFile: {
      context: pack.caseContext,
      role: `Vous intervenez comme référent ${program.skillLabel} sur ce dossier.`,
      symptoms: pack.caseSymptoms,
      data: [
        { label: 'Compétence visée', value: program.skillLabel },
        { label: 'Niveau initial', value: `${program.levelFrom} / 100` },
        { label: 'Niveau cible', value: `${program.levelTo} / 100` },
        { label: 'Sujets travaillés', value: topics.slice(0, 4).map((topic) => topic.title).join(' · ') },
        { label: 'Contrainte', value: 'Décision à prendre en 48 h, avec validation du superviseur' },
      ],
      constraints: [
        'Aucune décision disciplinaire ne peut être prise sur la base de ce dossier.',
        'Toute estimation doit être accompagnée d’un niveau de confiance.',
        'Les données personnelles ne sont pas accessibles.',
      ],
    },
    questions,
  };
}

/** 4. DOSSIER PROFESSIONNEL — livrable complet + entretien de vérification. */
export function buildProfessionalDossier(program: TrainingProgram): ProfessionalDossierDocument {
  const topics = programTopics(program);

  return {
    method: 'PROFESSIONAL_DOSSIER',
    title: `Dossier professionnel — ${program.title}`,
    instructions: [
      'Production individuelle sur plusieurs jours.',
      'Le dossier doit être autonome : une personne extérieure doit pouvoir le reprendre.',
      'Les sources, les décisions et les limites doivent être explicites.',
      'Un entretien court de vérification suit le dépôt pour confirmer la paternité du travail.',
      'Un dossier incomplet sur un critère éliminatoire est refusé.',
    ],
    submissionDays: 4,
    brief: `Produisez un dossier professionnel complet démontrant votre maîtrise de « ${program.subject} ». Le dossier doit couvrir : ${topics
      .slice(0, 4)
      .map((topic) => topic.title)
      .join(', ')}.`,
    requirements: [
      { id: 'req-1', label: 'Contexte et objectif', description: 'Problème traité, périmètre, contraintes.', weight: 10, mandatory: true },
      { id: 'req-2', label: 'Démarche', description: 'Étapes suivies, alternatives écartées et raisons.', weight: 20, mandatory: true },
      { id: 'req-3', label: 'Réalisation', description: 'Livrable concret, reproductible, vérifiable.', weight: 30, mandatory: true },
      { id: 'req-4', label: 'Qualité et contrôle', description: 'Critères de qualité, vérifications effectuées.', weight: 15, mandatory: true },
      { id: 'req-5', label: 'Risques et limites', description: 'Ce qui peut échouer, ce qui reste fragile.', weight: 10, mandatory: false },
      { id: 'req-6', label: 'Reprise par un pair', description: 'Documentation suffisante pour continuer sans vous.', weight: 15, mandatory: true },
    ],
    defenseQuestions: [
      { id: 'pd-d1', prompt: 'Sur quelle décision du dossier avez-vous hésité, et pourquoi ?', expectedThemes: ['alternative', 'critère de décision', 'conséquence'] },
      { id: 'pd-d2', prompt: 'Que se passerait-il si une contrainte changeait ?', expectedThemes: ['robustesse', 'adaptation', 'limites'] },
      { id: 'pd-d3', prompt: 'Quelle partie du dossier referiez-vous autrement ?', expectedThemes: ['auto-critique', 'apprentissage', 'amélioration'] },
    ],
  };
}

/** 5. SOUTENANCE — entretien adaptatif, relances et contre-exemples. */
export function buildDefenseInterview(program: TrainingProgram): DefenseInterviewDocument {
  const topics = programTopics(program);
  const kinds: Array<'FOND' | 'RELANCE' | 'CONTRE_EXEMPLE' | 'SITUATION'> = [
    'FOND',
    'FOND',
    'RELANCE',
    'CONTRE_EXEMPLE',
    'SITUATION',
    'FOND',
    'RELANCE',
    'CONTRE_EXEMPLE',
    'SITUATION',
  ];

  const questions = kinds.map((kind, index) => {
    const topic = topics[index % Math.max(1, topics.length)];
    const base = topic?.title ?? program.skillLabel;
    const prompts: Record<typeof kind, string> = {
      FOND: `Expliquez « ${base} » et ce que cela change concrètement dans votre travail.`,
      RELANCE: `Vous avez dit que « ${base} » fonctionne. Sur quel mécanisme exact repose-t-il ?`,
      CONTRE_EXEMPLE: `Contre-exemple : dans quel cas « ${base} » ne s’applique pas ou produit un mauvais résultat ?`,
      SITUATION: `Situation : ${topic?.objective ?? 'un cas dégradé survient'} Que faites-vous, dans quel ordre, et pourquoi ?`,
    };
    return {
      id: `di-q${index + 1}`,
      prompt: prompts[kind],
      kind,
      expectedThemes: topic?.notions.slice(0, 3) ?? ['définition', 'application', 'limites'],
      redFlags: ['Réponse récitée sans exemple', 'Aucune limite reconnue', 'Confusion entre observation et preuve'],
      points: index < 3 ? 15 : 11,
    };
  });

  return {
    method: 'DEFENSE_INTERVIEW',
    title: `Soutenance professionnelle — ${program.title}`,
    instructions: [
      'Entretien individuel de 20 à 30 minutes.',
      'Les questions s’adaptent à vos réponses : attendez-vous à des relances.',
      'Vous pouvez demander une reformulation, pas une réponse.',
      'Les contre-exemples font partie de l’évaluation.',
      'Une erreur critique sur une notion fondamentale invalide la soutenance.',
    ],
    durationMinutes: 30,
    opening: `Bonjour. Nous allons vérifier ensemble votre maîtrise de « ${program.subject} ». Commencez par expliquer ce que vous savez faire aujourd’hui que vous ne saviez pas faire avant cette formation.`,
    questions,
  };
}

export function buildEvaluationDocument(program: TrainingProgram, method: EvaluationDocument['method']): EvaluationDocument {
  switch (method) {
    case 'KNOWLEDGE_TEST':
      return buildKnowledgeTest(program);
    case 'TECHNICAL_CHALLENGE':
      return buildTechnicalChallenge(program);
    case 'CASE_ANALYSIS':
      return buildCaseAnalysis(program);
    case 'PROFESSIONAL_DOSSIER':
      return buildProfessionalDossier(program);
    case 'DEFENSE_INTERVIEW':
      return buildDefenseInterview(program);
    default:
      return buildKnowledgeTest(program);
  }
}
