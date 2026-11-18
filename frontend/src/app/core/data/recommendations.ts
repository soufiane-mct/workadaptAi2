import { TrainingFormat } from '../models';

/**
 * Recommandation de formats selon la nature de la compétence.
 * Sera fournie par le backend ; ici, règle déterministe et explicable.
 */
export function formatsForSkill(code: string): TrainingFormat[] {
  const value = code.toLowerCase();
  if (value.includes('docker') || value.includes('cicd') || value.includes('kubernetes')) {
    return ['PRACTICAL', 'PROJECT', 'SIMULATION', 'MULTIMEDIA'];
  }
  if (value.includes('test')) {
    return ['INTERACTIVE', 'PRACTICAL', 'PROJECT', 'MULTIMEDIA'];
  }
  if (value.includes('angular') || value.includes('typescript') || value.includes('front')) {
    return ['PROJECT', 'MULTIMEDIA', 'INTERACTIVE', 'AI_TUTORED'];
  }
  if (value.includes('git')) {
    return ['MULTIMEDIA', 'INTERACTIVE', 'PRACTICAL'];
  }
  if (value.includes('audit') || value.includes('qualit')) {
    return ['PROJECT', 'SIMULATION', 'MULTIMEDIA'];
  }
  return ['MULTIMEDIA', 'INTERACTIVE', 'PRACTICAL', 'PROJECT', 'SIMULATION', 'AI_TUTORED', 'COLLABORATIVE'];
}

/** Justification lisible d’une recommandation de format. */
export function formatRationale(format: TrainingFormat, skillLabel: string): string {
  switch (format) {
    case 'MULTIMEDIA':
      return `Installer une vision d’ensemble de ${skillLabel} avant de pratiquer.`;
    case 'INTERACTIVE':
      return `Ancrer durablement les notions de ${skillLabel} par répétition espacée.`;
    case 'PRACTICAL':
      return `Transformer la connaissance de ${skillLabel} en gestes fiables.`;
    case 'PROJECT':
      return `Mobiliser ${skillLabel} dans un livrable proche de votre poste.`;
    case 'SIMULATION':
      return `Apprendre à décider sur ${skillLabel} en situation dégradée.`;
    case 'AI_TUTORED':
      return `Débloquer les points incompris de ${skillLabel} par le dialogue.`;
    case 'COLLABORATIVE':
      return `Développer ${skillLabel} au contact des autres et par la revue.`;
    default:
      return `Développer ${skillLabel}.`;
  }
}
