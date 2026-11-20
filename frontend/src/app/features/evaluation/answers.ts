import { EvaluationAnswers } from '../../core/models';

/**
 * Lecture des réponses déjà saisies.
 *
 * Les épreuves conservent leurs réponses dans un brouillon : quitter
 * l'épreuve puis y revenir ne doit pas effacer le travail. Ces deux
 * fonctions relisent un brouillon pour réhydrater l'état du composant.
 */

/** Réponses textuelles, par identifiant de question. */
export function textAnswers(answers: EvaluationAnswers): Record<string, string> {
  const map: Record<string, string> = {};
  for (const [id, value] of Object.entries(answers)) {
    if (typeof value === 'string') {
      map[id] = value;
    }
  }
  return map;
}

/** Réponses à choix (indices), par identifiant de question. */
export function choiceAnswers(answers: EvaluationAnswers): Record<string, number[]> {
  const map: Record<string, number[]> = {};
  for (const [id, value] of Object.entries(answers)) {
    if (Array.isArray(value) && value.every((item) => typeof item === 'number')) {
      map[id] = value as number[];
    }
  }
  return map;
}
