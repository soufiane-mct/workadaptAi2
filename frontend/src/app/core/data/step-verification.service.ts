import { Injectable, inject, signal } from '@angular/core';
import {
  StepEvidence,
  StepEvidenceItem,
  StepVerification,
  StepVerdict,
  TrainingFormat,
} from '../models';
import { AuditService } from './audit.service';
import { CollectionService } from './collection.service';
import { NotificationService } from './notification.service';
import { WorkflowStateService } from './workflow-state.service';

const AGENT = 'Learning Evidence Agent';

/** Seuil de validation d'une preuve d'étape. */
const PASS_SCORE = 70;
const REVIEW_SCORE = 45;

/** Longueur minimale d'une observation attachée à un critère. */
const MIN_OBSERVATION = 20;

function normalise(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function tokens(value: string): string[] {
  return normalise(value)
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 4);
}

/**
 * Agent d'analyse des preuves d'étape.
 *
 * À chaque étape de formation, l'employé produit une preuve : commandes
 * réellement exécutées, critères observés, décisions, restitution écrite.
 * Ces données sont transmises à cet agent, qui statue sur la preuve :
 *
 * - une case cochée seule ne valide jamais une étape ;
 * - une étape sans trace vérifiable est renvoyée à l'employé (INCOMPLET) ;
 * - un parcours uniquement cliqué sans aucune trace est rejeté (REJETE).
 *
 * Le verdict est tracé dans l'audit et réinjecté dans la collecte permanente.
 */
@Injectable({ providedIn: 'root' })
export class StepVerificationService {
  private readonly audit = inject(AuditService);
  private readonly notifications = inject(NotificationService);
  private readonly collection = inject(CollectionService);
  private readonly workflow = inject(WorkflowStateService);

  private readonly _verifications = signal<StepVerification[]>([]);
  readonly verifications = this._verifications.asReadonly();

  forRequest(requestId: string): StepVerification[] {
    return this._verifications()
      .filter((item) => item.requestId === requestId)
      .sort((a, b) => b.at.localeCompare(a.at));
  }

  forUnit(requestId: string, unitId: string): StepVerification[] {
    return this.forRequest(requestId).filter((item) => item.unitId === unitId);
  }

  lastFor(requestId: string, unitId: string): StepVerification | undefined {
    return this.forUnit(requestId, unitId)[0];
  }

  /** Une unité n'est terminée que si sa dernière preuve a été validée. */
  isValidated(requestId: string, unitId: string): boolean {
    return this.lastFor(requestId, unitId)?.verdict === 'VALIDE';
  }

  /**
   * Analyse une preuve d'étape et renvoie le verdict de l'agent.
   */
  verify(input: {
    requestId: string;
    unitId: string;
    unitTitle: string;
    format: TrainingFormat;
    /** Notions attendues par le curriculum (objectif, points clés, critères). */
    notions: string[];
    evidence: StepEvidence;
    /** Employé concerné : cible des notifications adressées. */
    employeeId?: string;
  }): StepVerification {
    const evidence = input.evidence;
    const checked: string[] = [];
    const gaps: string[] = [];
    const reviewed: string[] = [];

    const narrative = (evidence.narrative ?? '').trim();
    const steps = evidence.steps ?? [];
    const criteria = evidence.criteria ?? [];
    const decisions = evidence.decisions ?? [];

    /* ---------------------------------------------------------- *
     * A. Complétude : tout ce qui était imposé a-t-il été fait ?
     * ---------------------------------------------------------- */
    const checks: { weight: number; ratio: number; label: string }[] = [];

    const imposed = [...steps, ...decisions];
    const doneImposed = imposed.filter((item) => item.done).length;
    if (imposed.length > 0) {
      const ratio = doneImposed / imposed.length;
      checks.push({ weight: 30, ratio, label: 'complétude des étapes' });
      if (ratio < 1) {
        const missing = imposed.filter((item) => !item.done).map((item) => item.label);
        gaps.push(
          `${imposed.length - doneImposed} action(s) imposée(s) non réalisée(s) : ${missing.slice(0, 3).join(' · ')}.`,
        );
      } else {
        checked.push(`${doneImposed} action(s) imposée(s) réalisée(s) et tracée(s).`);
      }
    }

    /* ---------------------------------------------------------- *
     * B. Couverture des critères : une case cochée ne suffit pas.
     * ---------------------------------------------------------- */
    if (criteria.length > 0) {
      const covered = criteria.filter((item) => this.criterionCovered(item)).length;
      const ratio = covered / criteria.length;
      checks.push({ weight: 25, ratio, label: 'critères observés' });
      if (covered < criteria.length) {
        const undocumented = criteria
          .filter((item) => !this.criterionCovered(item))
          .map((item) => item.label);
        gaps.push(
          `${criteria.length - covered} critère(s) de réussite sans observation vérifiable : ${undocumented.slice(0, 3).join(' · ')}. Une case cochée seule ne prouve rien : décrivez ce qui a été observé.`,
        );
      } else {
        checked.push(`${covered} critère(s) de réussite observés et documentés.`);
      }
    }

    /* ---------------------------------------------------------- *
     * C. Preuve d'exécution : les commandes ont-elles Produite
     *    une sortie observable ?
     * ---------------------------------------------------------- */
    if (evidence.kind === 'COMMANDES') {
      const commands = evidence.commands ?? [];
      const outputs = evidence.outputs ?? [];
      if (commands.length === 0) {
        gaps.push('Aucune commande exécutée : la preuve d’exécution est absente.');
        checks.push({ weight: 20, ratio: 0, label: 'exécution réelle' });
      } else {
        const withOutput = outputs.filter((output) => output.trim().length >= 10).length;
        const ratio = withOutput / commands.length;
        checks.push({ weight: 20, ratio, label: 'exécution réelle' });
        if (ratio < 1) {
          gaps.push(
            `${commands.length - withOutput} commande(s) exécutée(s) sans sortie observable : le résultat n’est pas démontré.`,
          );
        } else {
          checked.push(`${commands.length} commande(s) exécutée(s) avec sortie observable.`);
        }
        const distinct = new Set(outputs.map((output) => output.trim())).size;
        if (outputs.length > 1 && distinct <= 1) {
          gaps.push('Sorties de commande identiques : l’exécution réelle n’est pas démontrée.');
        }
      }
    }

    /* ---------------------------------------------------------- *
     * D. Restitution écrite : l'employé doit reformuler ce qu'il
     *    a fait, sinon la trace est muette.
     * ---------------------------------------------------------- */
    const narrativeRatio = narrative.length >= 60 ? 1 : narrative.length / 60;
    checks.push({ weight: 15, ratio: narrativeRatio, label: 'restitution écrite' });
    if (narrative.length < 60) {
      gaps.push(
        'Restitution écrite absente ou trop courte (60 caractères minimum) : l’agent ne peut pas vérifier ce qui a été fait.',
      );
    } else {
      checked.push(`Restitution écrite de ${narrative.length} caractères.`);
    }

    /* ---------------------------------------------------------- *
     * E. Ancrage : la restitution relie-t-elle l'action à l'objectif ?
     * ---------------------------------------------------------- */
    const notions = input.notions.filter((notion) => notion.trim().length > 0);
    const anchored = notions.filter((notion) => {
      const words = tokens(notion);
      if (words.length === 0) {
        return normalise(narrative).includes(normalise(notion));
      }
      return words.some((word) => normalise(narrative).includes(word));
    }).length;
    const anchorTarget = notions.length === 0 ? 0 : Math.min(2, Math.max(1, notions.length));
    const anchorRatio = anchorTarget === 0 ? 1 : Math.min(1, anchored / anchorTarget);
    checks.push({ weight: 10, ratio: anchorRatio, label: 'ancrage dans l’objectif' });
    if (anchorTarget > 0 && narrative.length >= 60 && anchored < anchorTarget) {
      gaps.push(
        'La restitution ne fait pas le lien explicite avec l’objectif de l’étape : citez les notions attendues.',
      );
    } else if (anchorTarget > 0) {
      checked.push(`${anchored} notion(s) du curriculum citée(s) dans la restitution.`);
    }

    /* ---------------------------------------------------------- *
     * F. Cohérence temporelle — le temps passé correspond-il au
     *    contenu attendu ?
     *
     * Le contrôle s'applique en mode réel. En mode démonstration, le
     * temps est compressé (facteur ×20) : le ratio entre le temps
     * réellement passé et la durée planifiée n'a alors aucun sens, et
     * l'appliquer rendrait le parcours impossible à terminer. Le mode
     * se règle explicitement dans l'écran d'administration — il n'est
     * jamais « oublié » dans un bloc commenté.
     * ---------------------------------------------------------- */
    const expected = Math.max(1, evidence.expectedMinutes);
    if (this.workflow.demoMode()) {
      checked.push(
        `Temps passé : ${Math.round(evidence.durationMinutes)} min (durée compressée en mode démonstration — contrôle temporel non applicable).`,
      );
    } else {
      const ratioTime = evidence.durationMinutes / expected;
      checks.push({
        weight: 10,
        ratio: Math.min(1, Math.max(0, ratioTime)),
        label: 'cohérence temporelle',
      });
      if (evidence.durationMinutes <= 0) {
        gaps.push(
          'Aucune durée passée sur cette étape : le travail réel n’est pas mesurable.',
        );
      } else if (ratioTime < 0.3) {
        gaps.push(
          `Temps passé (${Math.round(evidence.durationMinutes)} min) incohérent avec le contenu attendu (${expected} min) : vérifiez que l’étape a réellement été réalisée.`,
        );
      } else {
        checked.push(
          `Temps passé : ${Math.round(evidence.durationMinutes)} min pour ${expected} min attendues.`,
        );
      }
    }

    /* ---------------------------------------------------------- *
     * Score : moyenne pondérée des contrôles applicables.
     * ---------------------------------------------------------- */
    const totalWeight = checks.reduce((sum, check) => sum + check.weight, 0);
    const weighted = checks.reduce((sum, check) => sum + check.ratio * check.weight, 0);
    const score = totalWeight === 0 ? 0 : Math.round((weighted / totalWeight) * 100);

    /* ---------------------------------------------------------- *
     * Verdict : le score seul ne suffit pas, certaines lacunes
     * bloquent la validation (cases cochées sans trace).
     * ---------------------------------------------------------- */
    const blocking = gaps.some(
      (gap) =>
        gap.includes('sans observation vérifiable') ||
        gap.includes('Restitution écrite absente') ||
        gap.includes('preuve d’exécution est absente') ||
        gap.includes('sans sortie observable') ||
        gap.includes('Sorties de commande identiques') ||
        // Une étape sans temps mesurable n'a pas été réellement réalisée.
        gap.includes('travail réel n’est pas mesurable'),
    );
    const superficial =
      imposed.length > 0 &&
      imposed.every((item) => item.done) &&
      narrative.length === 0 &&
      criteria.every((item) => !item.detail || item.detail.trim().length === 0);

    let verdict: StepVerdict;
    if (superficial) {
      verdict = 'REJETE';
      gaps.push(
        'Validation superficielle détectée : toutes les cases sont cochées mais aucune trace n’a été produite. L’étape est renvoyée.',
      );
    } else if (score >= PASS_SCORE && !blocking) {
      verdict = 'VALIDE';
    } else if (score >= REVIEW_SCORE) {
      verdict = 'INCOMPLET';
    } else {
      verdict = 'REJETE';
    }

    /* ---------------------------------------------------------- *
     * Traçabilité : ce qui a été transmis à l’agent.
     * ---------------------------------------------------------- */
    for (const command of evidence.commands ?? []) {
      reviewed.push(`Commande exécutée : ${command}`);
    }
    for (const output of evidence.outputs ?? []) {
      reviewed.push(`Sortie observée : ${output}`);
    }
    for (const item of [...steps, ...decisions, ...criteria]) {
      reviewed.push(
        item.done
          ? `Élément réalisé : ${item.label}${item.detail ? ` — ${item.detail}` : ''}`
          : `Élément non réalisé : ${item.label}`,
      );
    }
    if (narrative) {
      reviewed.push(`Restitution : ${narrative}`);
    }

    const verification: StepVerification = {
      id: `ver-${input.requestId}-${Date.now()}`,
      requestId: input.requestId,
      unitId: input.unitId,
      unitTitle: input.unitTitle,
      format: input.format,
      at: new Date().toISOString(),
      verdict,
      score,
      confidence: verdict === 'VALIDE' ? 0.88 : verdict === 'INCOMPLET' ? 0.72 : 0.61,
      checked,
      gaps,
      feedback: this.feedbackFor(verdict, gaps),
      reviewed,
      agent: AGENT,
    };

    this._verifications.update((items) => [verification, ...items]);

    this.audit.log({
      actor: AGENT,
      action: 'Vérification d’une preuve d’étape',
      target: input.requestId,
      detail: `${input.unitTitle} — verdict ${verdict} (${score}/100). ${gaps.length} gap(s) : ${gaps
        .slice(0, 2)
        .join(' ')}`,
    });

    this.collection.recordStepVerification({
      requestId: input.requestId,
      unitId: input.unitId,
      unitTitle: input.unitTitle,
      verdict,
      score,
      gaps: gaps.length,
      agent: AGENT,
    });

    if (verdict !== 'VALIDE') {
      const rejections = this.forUnit(input.requestId, input.unitId).filter(
        (item) => item.verdict === 'REJETE',
      ).length;
      this.notifications.notify({
        type: 'TRAINING_STEP_REJECTED',
        title:
          verdict === 'REJETE'
            ? `Étape renvoyée : ${input.unitTitle}`
            : `Étape incomplète : ${input.unitTitle}`,
        message: `${AGENT} — ${gaps[0] ?? 'La preuve envoyée est insuffisante.'}`,
        audience: rejections >= 2 ? ['EMPLOYEE', 'MANAGER'] : ['EMPLOYEE'],
        link: `/app/formations/${input.requestId}`,
        employeeId: input.employeeId ?? 'emp-0001',
      });
    }

    return verification;
  }

  /** Un critère est couvert s’il est réalisé, ou si une observation le prouve. */
  private criterionCovered(item: StepEvidenceItem): boolean {
    if (item.done && (item.detail ?? '').trim().length >= MIN_OBSERVATION) {
      return true;
    }
    const detail = (item.detail ?? '').trim();
    if (detail.length < MIN_OBSERVATION) {
      return false;
    }
    const words = tokens(item.label);
    if (words.length === 0) {
      return true;
    }
    const haystack = normalise(detail);
    return words.some((word) => haystack.includes(word));
  }

  private feedbackFor(verdict: StepVerdict, gaps: string[]): string {
    if (verdict === 'VALIDE') {
      return 'Preuve vérifiée : l’étape est validée et versée au dossier de maîtrise.';
    }
    if (verdict === 'INCOMPLET') {
      return `Preuve incomplète : ${gaps[0] ?? 'renseignez les éléments manquants'} puis relancez la vérification.`;
    }
    return `Preuve refusée : ${gaps[0] ?? 'le travail réalisé ne correspond pas aux critères attendus'}. Reprenez l’étape avec des traces vérifiables.`;
  }
}
