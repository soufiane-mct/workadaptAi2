import {
  AiTutoredProgram,
  CollaborativeProgram,
  ExamQuestion,
  InteractiveProgram,
  MultimediaProgram,
  PracticalProgram,
  ProjectProgram,
  SimulationProgram,
  TrainingProgram,
} from '../../models';
import { KnowledgePack } from '../knowledge';
import {
  BuildContext,
  buildStudyPlan,
  complementaryFor,
  completionCriteria,
  estimatedDays,
  isoTimestamp,
  labsFor,
  padConcepts,
  programId,
  recommendedEvaluations,
  scenariosFor,
  targetHours,
  unitCount,
} from './helpers';

function examQuestions(pack: KnowledgePack, count: number, prefix: string): ExamQuestion[] {
  const source = pack.exam.length > 0 ? pack.exam : [];
  const result: ExamQuestion[] = [];
  for (let index = 0; index < count; index += 1) {
    const item = source[index % Math.max(1, source.length)];
    if (!item) {
      continue;
    }
    result.push({
      id: `${prefix}-q${index + 1}`,
      type: item.type,
      prompt: item.prompt,
      options: item.options,
      correctIndexes: item.correctIndexes,
      explanation: item.explanation,
      points: 1,
      critical: index < 2,
    });
  }
  return result;
}

/**
 * 1. MULTIMÉDIA — épisodes vidéo / article / podcast + dossier de synthèse.
 * Aucun quiz final : la preuve est un dossier de notes et une restitution.
 */
export function buildMultimediaProgram(ctx: BuildContext, pack: KnowledgePack): MultimediaProgram {
  const hours = targetHours(ctx);
  const count = unitCount(ctx, 55);
  const concepts = padConcepts(pack, count);

  const episodes = concepts.map((concept, index) => ({
    id: `ep-${ctx.requestId}-${index + 1}`,
    order: index + 1,
    title: `Épisode ${index + 1} — ${concept.title}`,
    objective: concept.objective,
    video: {
      title: `Vidéo : ${concept.title}`,
      durationMinutes: 18,
      chapters: concept.notions,
    },
    article: {
      title: `Article de référence : ${concept.title}`,
      sections: [
        ...concept.notions,
        `Exemple concret : ${concept.example}`,
        `Piège fréquent : ${concept.pitfall}`,
      ],
    },
    podcast: {
      title: `Podcast : retour d’expérience sur ${concept.title.toLowerCase()}`,
      durationMinutes: 12,
      summary: `Un professionnel raconte comment il applique « ${concept.title} » et ce qu’il aurait fait différemment.`,
    },
    keyPoints: concept.notions,
    notesPrompt: `Rédigez 5 lignes : ce que vous retenez de « ${concept.title} », et comment vous l’appliqueriez à ${ctx.subject}.`,
    restitutionQuestion: `Expliquez « ${concept.title} » à un collègue en 3 phrases, sans support.`,
    estimatedMinutes: 55,
  }));

  const unitMinutes = episodes.reduce((sum, episode) => sum + episode.estimatedMinutes, 0);
  const totalHours = Math.round((unitMinutes / 60) * 10) / 10;

  return {
    id: programId('prg-mm', ctx.requestId),
    requestId: ctx.requestId,
    format: 'MULTIMEDIA',
    skillCode: ctx.skillCode,
    skillLabel: ctx.skillLabel,
    title: `${ctx.skillLabel} — parcours multimédias`,
    summary: `Un parcours documenté en ${episodes.length} épisodes : vidéo, article, podcast et notes guidées, jusqu’à un dossier de synthèse personnel sur « ${ctx.subject} ».`,
    domain: ctx.domain,
    subject: ctx.subject,
    levelFrom: ctx.levelFrom,
    levelTo: ctx.levelTo,
    estimatedHours: totalHours,
    estimatedDays: estimatedDays(ctx, totalHours),
    objectives: [
      `Comprendre les notions clés de « ${ctx.subject} »`,
      `Relier chaque notion à une situation réelle de votre poste`,
      `Constituer un dossier de synthèse réutilisable`,
      `Restituer la démarche sans support`,
    ],
    studyPlan: buildStudyPlan(
      ctx,
      totalHours,
      episodes.map((episode) => episode.title),
    ),
    completion: completionCriteria(
      ctx,
      totalHours,
      episodes.length,
      'Dossier de synthèse complet, carte conceptuelle et restitution écrite',
      false,
    ),
    complementary: complementaryFor('MULTIMEDIA'),
    recommendedEvaluation: recommendedEvaluations('MULTIMEDIA'),
    status: 'READY',
    generatedAt: isoTimestamp(),
    episodes,
    synthesisDossier: {
      title: `Dossier de synthèse — ${ctx.subject}`,
      sections: [
        'Ce que j’ai compris : notions et définitions personnelles',
        'Ce que j’ai observé : exemples issus de mon poste',
        'Ce que je saurais faire demain : trois applications concrètes',
        'Ce qui reste fragile : points à consolider',
      ],
      conceptMap: pack.concepts.slice(0, 8).map((concept) => concept.title),
    },
  };
}

/**
 * 2. INTERACTIVE — decks de drills, répétition espacée, seuil de maîtrise.
 * Le quiz est ici chez lui, mais réparti sur plusieurs sessions.
 */
export function buildInteractiveProgram(ctx: BuildContext, pack: KnowledgePack): InteractiveProgram {
  const hours = targetHours(ctx);
  const count = unitCount(ctx, 55);
  const concepts = padConcepts(pack, count);

  const drillSets = concepts.map((concept, index) => ({
    id: `deck-${ctx.requestId}-${index + 1}`,
    order: index + 1,
    title: `Deck ${index + 1} — ${concept.title}`,
    notion: concept.title,
    cards: concept.notions.map((notion, cardIndex) => ({
      front: `${concept.title} — notion ${cardIndex + 1}`,
      back: notion,
    })),
    drills: examQuestions(pack, 6, `deck${index + 1}-${ctx.requestId}`).map((question, questionIndex) => ({
      ...question,
      id: `deck-${ctx.requestId}-${index + 1}-q${questionIndex + 1}`,
      prompt: `${question.prompt}`,
    })),
    masteryThreshold: 80,
    spacedReview: ['J+1 — rappel actif', 'J+3 — série mélangée', 'J+7 — test de rétention'],
    estimatedMinutes: 55,
  }));

  const unitMinutes = drillSets.reduce((sum, set) => sum + set.estimatedMinutes, 0);
  const totalHours = Math.round((unitMinutes / 60) * 10) / 10;

  return {
    id: programId('prg-int', ctx.requestId),
    requestId: ctx.requestId,
    format: 'INTERACTIVE',
    skillCode: ctx.skillCode,
    skillLabel: ctx.skillLabel,
    title: `${ctx.skillLabel} — parcours interactif`,
    summary: `Une progression par decks de drills avec répétition espacée : ${drillSets.length} decks, cartes de révision, séries de questions et seuil de maîtrise à 80 %.`,
    domain: ctx.domain,
    subject: ctx.subject,
    levelFrom: ctx.levelFrom,
    levelTo: ctx.levelTo,
    estimatedHours: totalHours,
    estimatedDays: estimatedDays(ctx, totalHours),
    objectives: [
      `Mémoriser durablement les notions de « ${ctx.subject} »`,
      `Répondre avec précision sur les cas ambigus`,
      `Maintenir la rétention sur plusieurs jours`,
    ],
    studyPlan: buildStudyPlan(
      ctx,
      totalHours,
      drillSets.map((set) => set.title),
    ),
    completion: completionCriteria(
      ctx,
      totalHours,
      drillSets.length,
      'Tous les decks au-dessus de 80 % de maîtrise, sur plusieurs sessions espacées',
    ),
    complementary: complementaryFor('INTERACTIVE'),
    recommendedEvaluation: recommendedEvaluations('INTERACTIVE'),
    status: 'READY',
    generatedAt: isoTimestamp(),
    drillSets,
    finalChallenge: {
      title: `Défi final — série mélangée sur ${ctx.subject}`,
      rules: [
        '30 questions mélangées, sans indice',
        'Chronomètre indicatif : 25 minutes',
        'Seuil de maîtrise : 80 %',
        'Les erreurs renvoient au deck correspondant',
      ],
      questions: examQuestions(pack, 10, `final-${ctx.requestId}`),
    },
  };
}

/**
 * 3. PRATIQUE — labs réels, environnement, critères, validation par preuve.
 * Aucun quiz : la preuve est l’exécution réussie.
 */
export function buildPracticalProgram(ctx: BuildContext, pack: KnowledgePack): PracticalProgram {
  const hours = targetHours(ctx);
  const count = unitCount(ctx, 75);
  const labs = labsFor(pack, count, ctx);

  const units = labs.map((lab, index) => ({
    id: `lab-${ctx.requestId}-${index + 1}`,
    order: index + 1,
    title: `Lab ${index + 1} — ${lab.title}`,
    brief: lab.brief,
    environment: lab.environment,
    steps: lab.steps,
    hints: lab.hints,
    commands: lab.commands,
    successCriteria: lab.criteria,
    validationMode: (index === labs.length - 1 ? 'CRITERIA' : 'AUTO') as 'AUTO' | 'CRITERIA' | 'HUMAN',
    estimatedMinutes: 75,
  }));

  const unitMinutes = units.reduce((sum, unit) => sum + unit.estimatedMinutes, 0);
  const totalHours = Math.round((unitMinutes / 60) * 10) / 10;

  return {
    id: programId('prg-pra', ctx.requestId),
    requestId: ctx.requestId,
    format: 'PRACTICAL',
    skillCode: ctx.skillCode,
    skillLabel: ctx.skillLabel,
    title: `${ctx.skillLabel} — parcours pratique`,
    summary: `${units.length} labs en environnement contrôlé, avec consignes, indices, commandes et critères de validation. La preuve de maîtrise est l’exécution, pas un questionnaire.`,
    domain: ctx.domain,
    subject: ctx.subject,
    levelFrom: ctx.levelFrom,
    levelTo: ctx.levelTo,
    estimatedHours: totalHours,
    estimatedDays: estimatedDays(ctx, totalHours),
    objectives: [
      `Exécuter les gestes techniques de « ${ctx.subject} »`,
      `Diagnostiquer et corriger une erreur`,
      `Produire un résultat vérifiable selon des critères`,
    ],
    studyPlan: buildStudyPlan(
      ctx,
      totalHours,
      units.map((unit) => unit.title),
    ),
    completion: completionCriteria(
      ctx,
      totalHours,
      units.length,
      'Tous les labs validés + tâche pratique finale conforme aux critères',
    ),
    complementary: complementaryFor('PRACTICAL'),
    recommendedEvaluation: recommendedEvaluations('PRACTICAL'),
    status: 'READY',
    generatedAt: isoTimestamp(),
    labs: units,
    finalTask: {
      title: `Tâche pratique finale — ${ctx.subject}`,
      brief: `Sans aide ni indice : réalisez la tâche complète de bout en bout et documentez vos décisions.`,
      criteria: [
        'Le résultat attendu est produit',
        'Les critères du dernier lab sont tous respectés',
        'Les décisions techniques sont justifiées',
        'Aucune étape critique n’a été sautée',
      ],
      deliverable: 'Résultat d’exécution + journal des commandes et décisions',
    },
  };
}

/**
 * 4. PROJET — jalons, livrables intermédiaires, revue finale par rubrique.
 */
export function buildProjectProgram(ctx: BuildContext, pack: KnowledgePack): ProjectProgram {
  const hours = targetHours(ctx);
  const count = unitCount(ctx, 150, 6, 8);
  const concepts = padConcepts(pack, count);

  const milestones = concepts.map((concept, index) => ({
    id: `ms-${ctx.requestId}-${index + 1}`,
    order: index + 1,
    title: `Jalon ${index + 1} — ${concept.title}`,
    brief: `Produisez le livrable de ce jalon en mobilisant « ${concept.title} » sur le projet « ${ctx.subject} ».`,
    deliverable: `Livrable J${index + 1} : ${concept.notions[0] ?? concept.title}`,
    tasks: [
      `Analyser le besoin lié à ${concept.title.toLowerCase()}`,
      `Réaliser : ${concept.example}`,
      'Documenter les décisions et les compromis',
      'Soumettre le livrable pour revue',
    ],
    criteria: [
      'Le livrable répond au besoin',
      `Le piège suivant est évité : ${concept.pitfall}`,
      'La documentation permet une reprise par un pair',
    ],
    estimatedMinutes: 150,
  }));

  const unitMinutes = milestones.reduce((sum, milestone) => sum + milestone.estimatedMinutes, 0);
  const totalHours = Math.round((unitMinutes / 60) * 10) / 10;

  return {
    id: programId('prg-pro', ctx.requestId),
    requestId: ctx.requestId,
    format: 'PROJECT',
    skillCode: ctx.skillCode,
    skillLabel: ctx.skillLabel,
    title: `${ctx.skillLabel} — projet guidé`,
    summary: `Un projet réel découpé en ${milestones.length} jalons avec livrables intermédiaires, revue par critères et livrable final.`,
    domain: ctx.domain,
    subject: ctx.subject,
    levelFrom: ctx.levelFrom,
    levelTo: ctx.levelTo,
    estimatedHours: totalHours,
    estimatedDays: estimatedDays(ctx, totalHours),
    objectives: [
      `Piloter un projet complet sur « ${ctx.subject} »`,
      `Produire des livrables intermédiaires de qualité`,
      `Justifier les décisions techniques et organisationnelles`,
    ],
    studyPlan: buildStudyPlan(
      ctx,
      totalHours,
      milestones.map((milestone) => milestone.title),
    ),
    completion: completionCriteria(
      ctx,
      totalHours,
      milestones.length,
      'Tous les jalons validés + livrable final accepté selon la rubrique',
    ),
    complementary: complementaryFor('PROJECT'),
    recommendedEvaluation: recommendedEvaluations('PROJECT'),
    status: 'READY',
    generatedAt: isoTimestamp(),
    milestones,
    finalReview: {
      rubric: [
        'Pertinence de la solution (30 %)',
        'Qualité de la réalisation (25 %)',
        'Documentation et reproductibilité (20 %)',
        'Justification des décisions (15 %)',
        'Autonomie et gestion des risques (10 %)',
      ],
      acceptance: [
        'Tous les jalons ont un livrable',
        'Le livrable final fonctionne ou est démontrable',
        'La documentation permet une reprise',
        'Les critères éliminatoires sont respectés',
      ],
    },
  };
}

/**
 * 5. SIMULATION — scénarios, décisions, conséquences, débrief.
 * Aucun cours : on agit dans une situation professionnelle.
 */
export function buildSimulationProgram(ctx: BuildContext, pack: KnowledgePack): SimulationProgram {
  const hours = targetHours(ctx);
  const count = unitCount(ctx, 80);
  const scenarios = scenariosFor(pack, count, ctx);

  const units = scenarios.map((scenario, index) => ({
    id: `sim-${ctx.requestId}-${index + 1}`,
    order: index + 1,
    title: `Scénario ${index + 1} — ${scenario.title}`,
    situation: scenario.situation,
    signals: scenario.signals,
    consoleLines: scenario.console,
    decisions: scenario.decisions.map((decision, decisionIndex) => ({
      id: `dec-${index + 1}-${decisionIndex + 1}`,
      prompt: decision.prompt,
      options: decision.options.map((option, optionIndex) => ({
        label: option.label,
        outcome: option.outcome,
        score: option.score,
        feedback: option.feedback,
      })),
    })),
    debriefQuestions: [
      `Quel signal avez-vous exploité en premier (${scenario.signals.join(', ')}) ? Pourquoi ?`,
      'Quelle décision auriez-vous prise différemment avec plus d’informations ?',
      'Quelle mesure préventive auriez-vous mise en place ?',
    ],
    estimatedMinutes: 80,
  }));

  const unitMinutes = units.reduce((sum, unit) => sum + unit.estimatedMinutes, 0);
  const totalHours = Math.round((unitMinutes / 60) * 10) / 10;

  return {
    id: programId('prg-sim', ctx.requestId),
    requestId: ctx.requestId,
    format: 'SIMULATION',
    skillCode: ctx.skillCode,
    skillLabel: ctx.skillLabel,
    title: `${ctx.skillLabel} — laboratoire de simulation`,
    summary: `${units.length} incidents simulés sur « ${ctx.subject} » : signaux, décisions, conséquences immédiates et débrief. La maîtrise se prouve par les décisions prises.`,
    domain: ctx.domain,
    subject: ctx.subject,
    levelFrom: ctx.levelFrom,
    levelTo: ctx.levelTo,
    estimatedHours: totalHours,
    estimatedDays: estimatedDays(ctx, totalHours),
    objectives: [
      `Diagnostiquer une situation dégradée`,
      `Décider sous contrainte et assumer les conséquences`,
      `Tirer un enseignement de chaque scénario`,
    ],
    studyPlan: buildStudyPlan(
      ctx,
      totalHours,
      units.map((unit) => unit.title),
    ),
    completion: completionCriteria(
      ctx,
      totalHours,
      units.length,
      'Tous les scénarios résolus avec un score de décision suffisant + débrief complété',
    ),
    complementary: complementaryFor('SIMULATION'),
    recommendedEvaluation: recommendedEvaluations('SIMULATION'),
    status: 'READY',
    generatedAt: isoTimestamp(),
    scenarios: units,
    incidentReport: {
      title: `Journal de décisions — ${ctx.subject}`,
      sections: [
        'Situation et signaux observés',
        'Hypothèses écartées et raisons',
        'Décisions prises et conséquences',
        'Mesure préventive proposée',
      ],
    },
  };
}

/**
 * 6. TUTEUR IA — sessions socratiques, niveaux d’explication, teach-back.
 */
export function buildAiTutoredProgram(ctx: BuildContext, pack: KnowledgePack): AiTutoredProgram {
  const hours = targetHours(ctx);
  const count = unitCount(ctx, 55);
  const concepts = padConcepts(pack, count);

  const sessions = concepts.map((concept, index) => ({
    id: `tut-${ctx.requestId}-${index + 1}`,
    order: index + 1,
    topic: concept.title,
    objective: concept.objective,
    opening: `Expliquez-moi avec vos mots ce que vous comprenez déjà de « ${concept.title} ».`,
    socraticPrompts: [
      `Pourquoi cela fonctionne-t-il selon vous ?`,
      `Que se passerait-il si l’on faisait l’inverse ?`,
      `Quel exemple de votre poste illustre « ${concept.title} » ?`,
      `Quelle est la limite de cette approche ?`,
    ],
    explanationLevels: [
      `Niveau 1 — analogie simple : ${concept.example}`,
      `Niveau 2 — mécanisme : ${concept.notions.join(' ; ')}`,
      `Niveau 3 — cas limite et piège : ${concept.pitfall}`,
    ],
    exercise: {
      prompt: `Résolvez un exercice nouveau sur « ${concept.title} » sans aide.`,
      expected: concept.notions,
      hints: ['Reformuler la question', 'Identifier la notion concernée'],
    },
    teachBack: {
      prompt: `Expliquez « ${concept.title} » comme si votre interlocuteur ne connaissait rien au sujet.`,
      keywords: concept.notions,
    },
    estimatedMinutes: 55,
  }));

  const unitMinutes = sessions.reduce((sum, session) => sum + session.estimatedMinutes, 0);
  const totalHours = Math.round((unitMinutes / 60) * 10) / 10;

  return {
    id: programId('prg-iai', ctx.requestId),
    requestId: ctx.requestId,
    format: 'AI_TUTORED',
    skillCode: ctx.skillCode,
    skillLabel: ctx.skillLabel,
    title: `${ctx.skillLabel} — tutorat IA`,
    summary: `${sessions.length} sessions de dialogue socratique, avec explications à trois niveaux, exercices générés et teach-back final.`,
    domain: ctx.domain,
    subject: ctx.subject,
    levelFrom: ctx.levelFrom,
    levelTo: ctx.levelTo,
    estimatedHours: totalHours,
    estimatedDays: estimatedDays(ctx, totalHours),
    objectives: [
      `Formuler avec précision les notions de « ${ctx.subject} »`,
      `Résoudre un exercice nouveau sans aide`,
      `Expliquer la démarche à un non-spécialiste`,
    ],
    studyPlan: buildStudyPlan(
      ctx,
      totalHours,
      sessions.map((session) => session.topic),
    ),
    completion: completionCriteria(
      ctx,
      totalHours,
      sessions.length,
      'Toutes les sessions terminées + teach-back validé + exercice nouveau réussi',
      false,
    ),
    complementary: complementaryFor('AI_TUTORED'),
    recommendedEvaluation: recommendedEvaluations('AI_TUTORED'),
    status: 'READY',
    generatedAt: isoTimestamp(),
    tutorSessions: sessions,
    masteryDialogue: {
      prompt: `Dernière étape : le tuteur vous propose un cas inédit sur « ${ctx.subject} ». Vous devez le résoudre en expliquant chaque choix.`,
      criteria: [
        'Le raisonnement est explicite',
        'Les notions sont nommées correctement',
        'Les limites sont reconnues',
        'L’exercice nouveau est résolu',
      ],
    },
  };
}

/**
 * 7. COLLABORATIF — sprints d’équipe, rôles, revue par les pairs, livrable commun.
 */
export function buildCollaborativeProgram(ctx: BuildContext, pack: KnowledgePack): CollaborativeProgram {
  const hours = targetHours(ctx);
  const count = unitCount(ctx, 210, 4, 6);
  const concepts = padConcepts(pack, count);

  const sprints = concepts.map((concept, index) => ({
    id: `spr-${ctx.requestId}-${index + 1}`,
    order: index + 1,
    title: `Sprint ${index + 1} — ${concept.title}`,
    teamGoal: `L’équipe fait progresser le livrable commun sur « ${ctx.subject} » en travaillant « ${concept.title} ».`,
    roles: [
      { name: 'Pilote de sprint', mission: 'Cadre l’objectif et arbitre les priorités', assignee: 'Membre A' },
      { name: 'Réalisateur', mission: `Produit la partie liée à ${concept.title.toLowerCase()}`, assignee: 'Vous' },
      { name: 'Relecteur', mission: 'Revue critique et contrôle qualité', assignee: 'Membre B' },
    ],
    individualTask: `Produire votre contribution personnelle sur « ${concept.title} » et la documenter.`,
    deliverable: `Contribution individuelle + mise à jour du livrable d’équipe (sprint ${index + 1})`,
    peerReviewCriteria: [
      'La contribution répond au besoin du sprint',
      'Les décisions sont explicables',
      'Le livrable reste compréhensible par un pair',
    ],
    syncCheckpoints: ['Début de sprint — cadrage', 'Mi-sprint — point de blocage', 'Fin de sprint — revue'],
    estimatedMinutes: 210,
  }));

  const unitMinutes = sprints.reduce((sum, sprint) => sum + sprint.estimatedMinutes, 0);
  const totalHours = Math.round((unitMinutes / 60) * 10) / 10;

  return {
    id: programId('prg-col', ctx.requestId),
    requestId: ctx.requestId,
    format: 'COLLABORATIVE',
    skillCode: ctx.skillCode,
    skillLabel: ctx.skillLabel,
    title: `${ctx.skillLabel} — parcours collaboratif`,
    summary: `${sprints.length} sprints d’équipe autour d’un livrable commun : rôles tournants, contribution individuelle identifiable, revues par les pairs.`,
    domain: ctx.domain,
    subject: ctx.subject,
    levelFrom: ctx.levelFrom,
    levelTo: ctx.levelTo,
    estimatedHours: totalHours,
    estimatedDays: estimatedDays(ctx, totalHours),
    objectives: [
      `Contribuer à un livrable collectif sur « ${ctx.subject} »`,
      `Réviser le travail d’un pair avec des critères explicites`,
      `Rendre sa contribution individuelle vérifiable`,
    ],
    studyPlan: buildStudyPlan(
      ctx,
      totalHours,
      sprints.map((sprint) => sprint.title),
    ),
    completion: completionCriteria(
      ctx,
      totalHours,
      sprints.length,
      'Livrable d’équipe accepté + contribution individuelle identifiée + toutes les revues réalisées',
    ),
    complementary: complementaryFor('COLLABORATIVE'),
    recommendedEvaluation: recommendedEvaluations('COLLABORATIVE'),
    status: 'READY',
    generatedAt: isoTimestamp(),
    sprints,
    teamDeliverable: {
      title: pack.teamMission,
      acceptance: [
        'Le livrable commun est complet',
        'Chaque membre a une contribution traçable',
        'Les revues sont documentées',
        'Les décisions collectives sont justifiées',
      ],
      contributionProof: 'Journal de contribution individuelle : tâches, décisions, revues effectuées',
    },
  };
}

/** Point d’entrée unique : choisit le builder, jamais un template commun. */
export function buildProgram(ctx: BuildContext, pack: KnowledgePack): TrainingProgram {
  switch (ctx.format) {
    case 'MULTIMEDIA':
      return buildMultimediaProgram(ctx, pack);
    case 'INTERACTIVE':
      return buildInteractiveProgram(ctx, pack);
    case 'PRACTICAL':
      return buildPracticalProgram(ctx, pack);
    case 'PROJECT':
      return buildProjectProgram(ctx, pack);
    case 'SIMULATION':
      return buildSimulationProgram(ctx, pack);
    case 'AI_TUTORED':
      return buildAiTutoredProgram(ctx, pack);
    case 'COLLABORATIVE':
      return buildCollaborativeProgram(ctx, pack);
    default:
      return buildMultimediaProgram(ctx, pack);
  }
}
