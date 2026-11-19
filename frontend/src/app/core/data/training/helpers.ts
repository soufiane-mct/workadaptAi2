import {
  CompletionCriteria,
  Domain,
  EvaluationMethod,
  StudySession,
  TrainingFormat,
  TrainingProgram,
  ComplementaryActivity,
} from '../../models';
import { KnowledgeConcept, KnowledgePack, KnowledgeScenario, KnowledgeLab } from '../knowledge';

export interface BuildContext {
  requestId: string;
  format: TrainingFormat;
  skillCode: string;
  skillLabel: string;
  subject: string;
  domain: Domain;
  levelFrom: number;
  levelTo: number;
  weeklyHours: number;
}

export function gapSize(ctx: BuildContext): number {
  return Math.max(1, ctx.levelTo - ctx.levelFrom);
}

/** Volume cible en heures, proportionné à l'écart (CDC : formation réelle, pas une démo). */
export function targetHours(ctx: BuildContext): number {
  const gap = gapSize(ctx);
  if (gap <= 10) return 7;
  if (gap <= 20) return 10;
  if (gap <= 35) return 15;
  return 20;
}

/** Nombre d'unités nécessaires pour atteindre le volume cible. */
export function unitCount(ctx: BuildContext, minutesPerUnit: number, min = 6, max = 12): number {
  const target = targetHours(ctx) * 60;
  return Math.min(max, Math.max(min, Math.ceil(target / minutesPerUnit)));
}

export function estimatedDays(ctx: BuildContext, hours: number): number {
  const perDay = Math.max(1, Math.min(3, ctx.weeklyHours / 2));
  return Math.max(3, Math.min(20, Math.ceil(hours / perDay)));
}

function dayLabel(index: number): string {
  const names = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  const week = Math.floor(index / 6) + 1;
  const name = names[index % 6];
  return `Semaine ${week} · ${name}`;
}

export function buildStudyPlan(ctx: BuildContext, hours: number, focuses: string[]): StudySession[] {
  const days = estimatedDays(ctx, hours);
  const perDay = Math.max(45, Math.round((hours * 60) / days));
  return Array.from({ length: days }, (_, index) => ({
    id: `ses-${ctx.requestId}-${index + 1}`,
    day: dayLabel(index),
    label: `Session ${index + 1}`,
    focus: focuses[index % Math.max(1, focuses.length)] ?? `Consolidation — ${ctx.skillLabel}`,
    minutes: perDay,
  }));
}

export function completionCriteria(
  hours: number,
  units: number,
  evidenceLabel: string,
  requireAllCheckpoints = true,
): CompletionCriteria {
  return {
    minMinutes: Math.round(hours * 60),
    requiredUnits: units,
    requireAllCheckpoints,
    requireCapstone: true,
    passScore: 75,
    evidenceLabel,
  };
}

/** Recommandation d'évaluation selon le format dominant (l'employé reste libre). */
export function recommendedEvaluations(format: TrainingFormat): EvaluationMethod[] {
  switch (format) {
    case 'PRACTICAL':
      return ['TECHNICAL_CHALLENGE', 'PROFESSIONAL_DOSSIER', 'CASE_ANALYSIS'];
    case 'PROJECT':
      return ['PROFESSIONAL_DOSSIER', 'TECHNICAL_CHALLENGE', 'DEFENSE_INTERVIEW'];
    case 'SIMULATION':
      return ['CASE_ANALYSIS', 'TECHNICAL_CHALLENGE', 'DEFENSE_INTERVIEW'];
    case 'AI_TUTORED':
      return ['DEFENSE_INTERVIEW', 'KNOWLEDGE_TEST', 'CASE_ANALYSIS'];
    case 'COLLABORATIVE':
      return ['PROFESSIONAL_DOSSIER', 'DEFENSE_INTERVIEW', 'CASE_ANALYSIS'];
    case 'INTERACTIVE':
      return ['KNOWLEDGE_TEST', 'DEFENSE_INTERVIEW', 'TECHNICAL_CHALLENGE'];
    default:
      return ['KNOWLEDGE_TEST', 'DEFENSE_INTERVIEW', 'PROFESSIONAL_DOSSIER'];
  }
}

/** Au maximum deux activités complémentaires, rendues dans leur format natif. */
export function complementaryFor(format: TrainingFormat): ComplementaryActivity[] {
  switch (format) {
    case 'MULTIMEDIA':
      return [
        { id: 'comp-mm-1', format: 'INTERACTIVE', title: 'Série de drills de consolidation', rationale: 'Ancrer les notions par répétition espacée après les épisodes.', minutes: 45 },
        { id: 'comp-mm-2', format: 'PRACTICAL', title: 'Lab d’application guidée', rationale: 'Vérifier le passage de la compréhension à l’exécution.', minutes: 60 },
      ];
    case 'INTERACTIVE':
      return [
        { id: 'comp-int-1', format: 'MULTIMEDIA', title: 'Épisode de synthèse', rationale: 'Recontextualiser les notions révisées.', minutes: 40 },
      ];
    case 'PRACTICAL':
      return [
        { id: 'comp-pra-1', format: 'SIMULATION', title: 'Incident à diagnostiquer', rationale: 'Confronter la pratique à une situation dégradée.', minutes: 60 },
        { id: 'comp-pra-2', format: 'MULTIMEDIA', title: 'Fiche de référence', rationale: 'Consolider les commandes et les pièges.', minutes: 30 },
      ];
    case 'PROJECT':
      return [
        { id: 'comp-pro-1', format: 'PRACTICAL', title: 'Lab préparatoire', rationale: 'Sécuriser les gestes techniques avant le projet.', minutes: 60 },
        { id: 'comp-pro-2', format: 'COLLABORATIVE', title: 'Revue par les pairs', rationale: 'Confronter le livrable à un regard extérieur.', minutes: 45 },
      ];
    case 'SIMULATION':
      return [
        { id: 'comp-sim-1', format: 'PRACTICAL', title: 'Lab de remédiation', rationale: 'Rejouer les gestes échoués en environnement guidé.', minutes: 50 },
      ];
    case 'AI_TUTORED':
      return [
        { id: 'comp-iai-1', format: 'PRACTICAL', title: 'Exercice appliqué', rationale: 'Transformer l’explication en exécution.', minutes: 45 },
      ];
    case 'COLLABORATIVE':
      return [
        { id: 'comp-col-1', format: 'PROJECT', title: 'Contribution individuelle', rationale: 'Isoler la part personnelle du livrable collectif.', minutes: 90 },
      ];
    default:
      return [];
  }
}

export function padConcepts(pack: KnowledgePack, count: number): KnowledgeConcept[] {
  const base = pack.concepts.length > 0 ? pack.concepts : [];
  const result: KnowledgeConcept[] = [];
  for (let index = 0; index < count; index += 1) {
    const concept = base[index % Math.max(1, base.length)];
    if (!concept) {
      break;
    }
    result.push(index < base.length ? concept : {
      ...concept,
      title: `${concept.title} — approfondissement ${Math.floor(index / base.length) + 1}`,
      objective: `Approfondir : ${concept.objective}`,
    });
  }
  return result;
}

export function labsFor(pack: KnowledgePack, count: number, ctx: BuildContext): KnowledgeLab[] {
  const result: KnowledgeLab[] = [];
  for (let index = 0; index < count; index += 1) {
    if (index < pack.labs.length) {
      result.push(pack.labs[index]);
      continue;
    }
    const concept = pack.concepts[index % Math.max(1, pack.concepts.length)];
    result.push({
      title: `Lab complémentaire — ${concept?.title ?? ctx.skillLabel}`,
      brief: `Appliquer « ${concept?.title ?? ctx.subject} » dans un cas différent de celui du module.`,
      environment: 'Environnement de travail simulé',
      steps: ['Reformuler l’objectif', 'Réaliser l’activité', 'Vérifier selon les critères', 'Documenter les écarts'],
      criteria: ['L’objectif est atteint', 'La preuve est produite', 'Les décisions sont justifiées'],
      commands: ['préparer', 'exécuter', 'vérifier'],
      hints: ['Comparer avec le cas guidé', 'Relire les critères avant de soumettre'],
    });
  }
  return result;
}

export function scenariosFor(pack: KnowledgePack, count: number, ctx: BuildContext): KnowledgeScenario[] {
  const result: KnowledgeScenario[] = [];
  for (let index = 0; index < count; index += 1) {
    if (index < pack.scenarios.length) {
      result.push(pack.scenarios[index]);
      continue;
    }
    const concept = pack.concepts[index % Math.max(1, pack.concepts.length)];
    result.push({
      title: `Scénario complémentaire — ${concept?.title ?? ctx.skillLabel}`,
      situation: `Une situation professionnelle mobilise « ${concept?.title ?? ctx.subject} » et dérive progressivement.`,
      signals: ['Écart entre attendu et observé', 'Pression de délai', 'Documentation incomplète'],
      console: ['$ statut', 'anomalie', '$ historique', 'trace partielle'],
      decisions: [
        {
          prompt: 'Première décision ?',
          options: [
            { label: 'Collecter les faits avant d’agir', outcome: 'La cause probable est identifiée.', score: 2, feedback: 'Le diagnostic précède la correction.' },
            { label: 'Appliquer une correction immédiate', outcome: 'Le symptôme masque la cause.', score: 0, feedback: 'Correction non fondée.' },
          ],
        },
        {
          prompt: 'Comment sécuriser la suite ?',
          options: [
            { label: 'Documenter et faire valider', outcome: 'La décision est traçable.', score: 2, feedback: 'Validation humaine et traçabilité.' },
            { label: 'Continuer sans trace', outcome: 'Aucune revue possible.', score: 0, feedback: 'Risque non maîtrisé.' },
          ],
        },
      ],
    });
  }
  return result;
}

export function isoTimestamp(offsetMinutes = 0): string {
  return new Date(Date.now() + offsetMinutes * 60_000).toISOString();
}

export function programId(prefix: string, requestId: string): string {
  return `${prefix}-${requestId}`;
}

export interface ProgramUnit {
  id: string;
  title: string;
  minutes: number;
  /** Libellé de l’unité selon le format (épisode, lab, jalon…). */
  kind: string;
}

/** Extrait la liste d’unités réelle du programme, quel que soit son format. */
export function programUnits(program: TrainingProgram): ProgramUnit[] {
  switch (program.format) {
    case 'MULTIMEDIA':
      return program.episodes.map((episode) => ({
        id: episode.id,
        title: episode.title,
        minutes: episode.estimatedMinutes,
        kind: 'Épisode',
      }));
    case 'INTERACTIVE':
      return program.drillSets.map((set) => ({
        id: set.id,
        title: set.title,
        minutes: set.estimatedMinutes,
        kind: 'Deck',
      }));
    case 'PRACTICAL':
      return program.labs.map((lab) => ({
        id: lab.id,
        title: lab.title,
        minutes: lab.estimatedMinutes,
        kind: 'Lab',
      }));
    case 'PROJECT':
      return program.milestones.map((milestone) => ({
        id: milestone.id,
        title: milestone.title,
        minutes: milestone.estimatedMinutes,
        kind: 'Jalon',
      }));
    case 'SIMULATION':
      return program.scenarios.map((scenario) => ({
        id: scenario.id,
        title: scenario.title,
        minutes: scenario.estimatedMinutes,
        kind: 'Scénario',
      }));
    case 'AI_TUTORED':
      return program.tutorSessions.map((session) => ({
        id: session.id,
        title: session.topic,
        minutes: session.estimatedMinutes,
        kind: 'Session',
      }));
    case 'COLLABORATIVE':
      return program.sprints.map((sprint) => ({
        id: sprint.id,
        title: sprint.title,
        minutes: sprint.estimatedMinutes,
        kind: 'Sprint',
      }));
    default:
      return [];
  }
}

/** Preuve de fin attendue, propre au format. */
export function capstoneOf(program: TrainingProgram): { title: string; deliverable: string } {
  switch (program.format) {
    case 'MULTIMEDIA':
      return {
        title: program.synthesisDossier.title,
        deliverable: 'Dossier de synthèse : quatre sections rédigées + carte conceptuelle',
      };
    case 'INTERACTIVE':
      return {
        title: program.finalChallenge.title,
        deliverable: 'Série mélangée terminée au-dessus du seuil de maîtrise',
      };
    case 'PRACTICAL':
      return {
        title: program.finalTask.title,
        deliverable: program.finalTask.deliverable,
      };
    case 'PROJECT':
      return {
        title: 'Livrable final du projet',
        deliverable: program.finalReview.acceptance.join(' · '),
      };
    case 'SIMULATION':
      return {
        title: program.incidentReport.title,
        deliverable: 'Journal de décisions et débrief complété',
      };
    case 'AI_TUTORED':
      return {
        title: 'Dialogue de maîtrise',
        deliverable: program.masteryDialogue.prompt,
      };
    case 'COLLABORATIVE':
      return {
        title: program.teamDeliverable.title,
        deliverable: program.teamDeliverable.contributionProof,
      };
    default:
      return { title: 'Livrable final', deliverable: 'Preuve de fin de parcours' };
  }
}

