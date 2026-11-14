import {
  EvaluationTask,
  GeneratedEvaluation,
  ModuleFormat,
  QuizQuestion,
} from '../models';
import { knowledgeFor } from './training-generator';

function codeFromLabel(label: string): string {
  const value = label.toLowerCase();
  if (value.includes('docker')) return 'docker';
  if (value.includes('ci/cd')) return 'cicd';
  if (value.includes('kubernetes')) return 'kubernetes';
  if (value.includes('test')) return 'tests';
  if (value.includes('angular')) return 'angular';
  return 'generic';
}

function evaluationQuiz(label: string, evaluationId: string, code: string, subject: string): QuizQuestion[] {
  const knowledge = knowledgeFor(code, label, subject);
  return knowledge.quiz.map((question, index) => ({
    ...question,
    id: `${evaluationId}-q${index + 1}`,
    skill: label,
  }));
}

/**
 * Génère l'évaluation finale à partir du parcours réellement terminé et du
 * format choisi par l'employé. Les sept formats produisent des activités
 * différentes mais un score comparable sur 100.
 */
export function generateEvaluation(input: {
  courseId: string;
  courseTitle: string;
  skills: string[];
  levelFrom: number;
  levelTo: number;
  format: ModuleFormat;
}): GeneratedEvaluation {
  const evaluationId = `eval-${input.courseId}-${input.format.toLowerCase()}`;
  const label = input.skills[0] ?? 'Compétence ciblée';
  const code = codeFromLabel(label);
  const knowledge = knowledgeFor(code, label, input.courseTitle);
  const quiz = evaluationQuiz(label, evaluationId, code, input.courseTitle);
  const tasks: EvaluationTask[] = [];

  const add = (task: Omit<EvaluationTask, 'id'>): void => {
    tasks.push({ ...task, id: `${evaluationId}-t${tasks.length + 1}` });
  };

  switch (input.format) {
    case 'MULTIMEDIA':
      add({
        kind: 'STUDY',
        title: 'Analyse des ressources du parcours',
        instructions:
          'Relisez les ressources du parcours, puis identifiez trois éléments que vous réutiliseriez en situation réelle.',
        body: knowledge.sources.map((source) => source.title),
        points: 20,
      });
      add({
        kind: 'QUIZ',
        title: 'Questionnaire de compréhension',
        instructions: 'Répondez aux quatre questions issues du parcours terminé.',
        body: [],
        points: 80,
        quiz: { questions: quiz },
      });
      break;
    case 'INTERACTIVE':
      add({
        kind: 'QUIZ',
        title: 'Quiz final complet',
        instructions: 'QCM, vrai/faux, question technique et situation professionnelle.',
        body: [],
        points: 100,
        quiz: { questions: quiz },
      });
      break;
    case 'PRACTICAL':
      add({
        kind: 'CODE',
        title: 'Exercice technique évalué',
        instructions: 'Réalisez l’exercice puis vérifiez les critères automatiques.',
        body: knowledge.code.criteria,
        points: 70,
        exercise: knowledge.code,
      });
      add({
        kind: 'QUIZ',
        title: 'Justification des choix',
        instructions: 'Expliquez vos choix techniques à travers ce contrôle.',
        body: [],
        points: 30,
        quiz: { questions: quiz.slice(0, 2) },
      });
      break;
    case 'PROJECT':
      add({
        kind: 'PROJECT',
        title: 'Livrable de projet',
        instructions:
          'Produisez un livrable court qui décrit la démarche, le résultat obtenu et la vérification finale.',
        body: knowledge.projectSteps.map((projectStep) => `${projectStep.title} : ${projectStep.deliverable}`),
        points: 70,
        deliverable: 'Note de projet avec démarche, résultat et vérification.',
        reviewCriteria: knowledge.peerCriteria,
      });
      add({
        kind: 'QUIZ',
        title: 'Contrôle des acquis',
        instructions: 'Validez les notions clés du projet.',
        body: [],
        points: 30,
        quiz: { questions: quiz.slice(0, 2) },
      });
      break;
    case 'SIMULATION':
      add({
        kind: 'DECISION',
        title: 'Scénario de production',
        instructions: 'Choisissez la réaction la plus pertinente à chaque situation.',
        body: ['Vous êtes en situation réelle : chaque décision a une conséquence.'],
        points: 70,
        decisions: knowledge.decisions,
      });
      add({
        kind: 'QUIZ',
        title: 'Débriefing technique',
        instructions: 'Validez les principes sous-jacents aux décisions prises.',
        body: [],
        points: 30,
        quiz: { questions: quiz.slice(0, 2) },
      });
      break;
    case 'AI_TUTORED':
      add({
        kind: 'CHAT',
        title: 'Entretien technique avec le tuteur IA',
        instructions:
          'Expliquez votre démarche et ce que vous avez appris. Le tuteur évalue la précision et la profondeur de votre réponse.',
        body: knowledge.concepts.map((concept) => `${concept.title} — ${concept.detail}`),
        points: 40,
        expectedKeywords: knowledge.commands.slice(0, 3),
      });
      add({
        kind: 'QUIZ',
        title: 'Exercice adaptatif',
        instructions: 'Le tuteur génère un contrôle à partir de vos réponses.',
        body: [],
        points: 60,
        quiz: { questions: quiz.slice(0, 3) },
      });
      break;
    case 'COLLABORATIVE':
      add({
        kind: 'REVIEW',
        title: 'Revue de pair et livrable d’équipe',
        instructions:
          'Décrivez votre contribution, le rôle tenu et la vérification faite par un pair. La revue suit les critères du parcours.',
        body: knowledge.peerCriteria,
        points: 60,
        reviewCriteria: knowledge.peerCriteria,
      });
      add({
        kind: 'QUIZ',
        title: 'Contrôle individuel',
        instructions: 'Chaque membre valide les acquis individuellement.',
        body: [],
        points: 40,
        quiz: { questions: quiz.slice(0, 3) },
      });
      break;
  }

  return {
    id: evaluationId,
    courseId: input.courseId,
    courseTitle: input.courseTitle,
    format: input.format,
    title: `Évaluation ${input.format.toLowerCase()} — ${label}`,
    summary: `Évaluation générée à partir du parcours « ${input.courseTitle} » et du format choisi.`,
    passScore: 75,
    tasks,
    generatedAt: new Date().toISOString(),
  };
}
