import { computed, effect, inject, Injectable, signal } from '@angular/core';
import {
  AnswerValue,
  CaseAnalysisDocument,
  CriterionResult,
  DefenseInterviewDocument,
  DEFENSE_QUESTION_KIND_LABELS,
  EVALUATION_METHOD_INFO,
  EVALUATION_METHOD_LABELS,
  EVALUATION_METHODS,
  EvaluationAnswers,
  EvaluationDecision,
  EvaluationDocument,
  EvaluationMethod,
  EvaluationRecord,
  EvaluationReport,
  ExamQuestion,
  KnowledgeTestDocument,
  ProfessionalDossierDocument,
  TechnicalChallengeDocument,
  TrainingProgram,
} from '../models';
import { AuditService } from './audit.service';
import { buildEvaluationDocument, programTopics } from './evaluation/builders';
import { TrainingService } from './training.service';
import { WorkflowStateService } from './workflow-state.service';
import { DemoStateStore } from './demo-state.store';

const EMPTY_ANSWERS: EvaluationAnswers = {};

function normalise(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function words(value: string): string[] {
  return normalise(value)
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 4);
}

function coverage(text: string, themes: string[]): number {
  if (!text || themes.length === 0) {
    return 0;
  }
  const haystack = normalise(text);
  const hits = themes.filter((theme) => {
    const tokens = words(theme);
    if (tokens.length === 0) {
      return haystack.includes(normalise(theme));
    }
    return tokens.some((token) => haystack.includes(token));
  }).length;
  return hits / themes.length;
}

function round(value: number): number {
  return Math.round(Math.max(0, Math.min(100, value)));
}

/**
 * Domaine Évaluation — cinq instruments réellement distincts.
 *
 * Aucun contenu de formation n'est réutilisé ici : chaque méthode possède
 * son propre document, son mode de passation, sa correction et sa preuve.
 * L'employé choisit la méthode APRÈS la fin de la formation ; l'IA génère
 * l'évaluation à partir du parcours exact qu'il a suivi.
 */
@Injectable({ providedIn: 'root' })
export class EvaluationService {
  private readonly training = inject(TrainingService);
  private readonly audit = inject(AuditService);
  private readonly workflow = inject(WorkflowStateService);
  private readonly store = inject(DemoStateStore);

  private readonly _records = signal<EvaluationRecord[]>(
    this.store.read<EvaluationRecord[]>('evaluation.records', []),
  );
  private readonly _reports = signal<EvaluationReport[]>(
    this.store.read<EvaluationReport[]>('evaluation.reports', []),
  );
  /**
   * Brouillons de réponses, par évaluation.
   *
   * Les réponses saisies sont conservées au fil de la navigation : quitter
   * l'épreuve puis y revenir ne doit pas effacer le travail. Le brouillon
   * est distinct de l'enregistrement de l'épreuve (qui reste figé à la
   * remise) pour ne pas modifier l'identité de l'enregistrement — sans
   * quoi le composant serait recréé à chaque frappe.
   */
  private readonly _drafts = signal<Record<string, EvaluationAnswers>>(
    this.store.read<Record<string, EvaluationAnswers>>('evaluation.drafts', {}),
  );

  readonly records = this._records.asReadonly();
  readonly reports = this._reports.asReadonly();

  readonly methods = EVALUATION_METHODS;
  readonly methodInfo = EVALUATION_METHOD_INFO;
  readonly methodLabels = EVALUATION_METHOD_LABELS;

  readonly corrected = computed(() => this._records().filter((record) => record.status === 'CORRIGEE'));

  readonly passed = computed(() =>
    this._records().filter((record) => record.decision === 'REUSSI'),
  );

  readonly failed = computed(() =>
    this._records().filter((record) => record.decision === 'ECHOUE'),
  );

  constructor() {
    effect(() => {
      this.store.write('evaluation.records', this._records());
      this.store.write('evaluation.reports', this._reports());
      this.store.write('evaluation.drafts', this._drafts());
    });
  }

  /* ---------------------------------------------------------------- *
   * Lecture
   * ---------------------------------------------------------------- */

  forRequest(requestId: string): EvaluationRecord | undefined {
    return [...this._records()]
      .filter((record) => record.requestId === requestId)
      .sort((a, b) => b.generatedAt.localeCompare(a.generatedAt))[0];
  }

  /** Lecture limitée à l'espace d'un collaborateur. */
  forRequestFor(requestId: string, employeeId: string): EvaluationRecord | undefined {
    return [...this._records()]
      .filter((record) => record.requestId === requestId && record.employeeId === employeeId)
      .sort((a, b) => b.generatedAt.localeCompare(a.generatedAt))[0];
  }

  attempts(requestId: string): number {
    return this._records().filter((record) => record.requestId === requestId).length;
  }

  reportFor(evaluationId: string): EvaluationReport | undefined {
    return this._reports().find((report) => report.evaluationId === evaluationId);
  }

  reportForEmployee(evaluationId: string, employeeId: string): EvaluationReport | undefined {
    const owned = this._records().some(
      (record) => record.id === evaluationId && record.employeeId === employeeId,
    );
    return owned ? this.reportFor(evaluationId) : undefined;
  }

  latestReport(): EvaluationReport | undefined {
    return [...this._reports()].sort((a, b) => b.at.localeCompare(a.at))[0];
  }

  /** Une évaluation ne peut être ouverte qu'après la fin réelle de la formation. */
  canEvaluate(requestId: string): { allowed: boolean; reason: string } {
    const request = this.training.requestById(requestId);
    if (!request) {
      return { allowed: false, reason: 'Demande de formation introuvable.' };
    }
    if (request.status !== 'COMPLETED') {
      return {
        allowed: false,
        reason: 'L’évaluation est accessible uniquement après la fin complète de la formation.',
      };
    }
    return { allowed: true, reason: '' };
  }

  /* ---------------------------------------------------------------- *
   * Génération (à partir du parcours réellement suivi)
   * ---------------------------------------------------------------- */

  open(requestId: string, method: EvaluationMethod): { ok: boolean; message: string } {
    const guard = this.canEvaluate(requestId);
    if (!guard.allowed) {
      return { ok: false, message: guard.reason };
    }
    const program = this.training.programFor(requestId);
    const request = this.training.requestById(requestId);
    if (!program || !request) {
      return { ok: false, message: 'Parcours introuvable.' };
    }
    // Un certificat a déjà été délivré : aucune nouvelle évaluation n'est
    // ouverte. La maîtrise est établie, la boucle s'arrête là.
    if (request.certificateId) {
      return {
        ok: false,
        message:
          'Un certificat a déjà été délivré pour cette formation : aucune nouvelle évaluation n’est nécessaire.',
      };
    }

    const document = buildEvaluationDocument(program, method);
    const record: EvaluationRecord = {
      id: `eval-${requestId}-${Date.now()}`,
      requestId,
      trainingId: program.id,
      employeeId: request.employeeId,
      employeeName: request.employeeName,
      method,
      status: 'PRETE',
      document,
      answers: { ...EMPTY_ANSWERS },
      corrections: [],
      score: 0,
      decision: 'REVUE_HUMAINE',
      attempt: this.attempts(requestId) + 1,
      generatedAt: new Date().toISOString(),
    };

    this._records.update((records) => [record, ...records]);
    this.persistEvaluation();
    this.audit.log({
      actor: 'Agent d’évaluation et de certification',
      action: 'Génération d’évaluation',
      target: record.id,
      detail: `${EVALUATION_METHOD_LABELS[method]} généré depuis le parcours ${program.id} (${programTopics(program).length} sujets travaillés).`,
    });

    return {
      ok: true,
      message: `${EVALUATION_METHOD_LABELS[method]} prêt : ${this.durationLabel(document)}.`,
    };
  }

  start(requestId: string): void {
    const record = this.forRequest(requestId);
    if (!record || record.status !== 'PRETE') {
      return;
    }
    this.patchRecord(record.id, { status: 'EN_COURS' });
    this.workflow.setEvaluationInProgress(true);
    this.audit.log({
      actor: record.employeeName,
      action: 'Début d’évaluation',
      target: record.id,
      detail: `${EVALUATION_METHOD_LABELS[record.method]} commencée.`,
    });
  }

  saveAnswers(requestId: string, answers: EvaluationAnswers): void {
    const record = this.forRequest(requestId);
    if (!record) {
      return;
    }
    this.patchRecord(record.id, { answers });
  }

  /* ---------------------------------------------------------------- *
   * Brouillon de réponses (conservation pendant la passation)
   * ---------------------------------------------------------------- */

  /** Réponses en cours de saisie pour une évaluation. */
  draft(evaluationId: string): EvaluationAnswers {
    return this._drafts()[evaluationId] ?? {};
  }

  /** Enregistre le brouillon de réponses sans clore l'épreuve. */
  saveDraft(evaluationId: string, answers: EvaluationAnswers): void {
    this._drafts.update((drafts) => ({ ...drafts, [evaluationId]: answers }));
    this.persistEvaluation();
  }

  /* ---------------------------------------------------------------- *
   * Passage et correction
   * ---------------------------------------------------------------- */

  submit(requestId: string, answers: EvaluationAnswers): EvaluationReport | undefined {
    const record = this.forRequest(requestId);
    const program = this.training.programFor(requestId);
    if (!record || !program) {
      return undefined;
    }
    if (!['PRETE', 'EN_COURS'].includes(record.status)) {
      return this.reportFor(record.id);
    }

    const corrections = this.correct(record.method, record.document, answers);
    // Le score est une note sur 100 : moyenne pondérée des critères (jamais la
    // somme brute des points, qui dépend du barème de chaque méthode).
    const totalWeight = corrections.reduce((sum, item) => sum + (item.weight ?? 0), 0);
    const weighted = corrections.reduce(
      (sum, item) =>
        sum + (item.max > 0 ? (item.earned / item.max) * (item.weight ?? 0) : 0),
      0,
    );
    const score = totalWeight > 0 ? round((weighted / totalWeight) * 100) : 0;
    const passScore = program.completion.passScore;
    // Une règle éliminatoire violée invalide l'épreuve : le score ne peut
    // pas compenser une exigence bloquante non satisfaite.
    const blocking = this.blockingFailures(record.method, record.document, answers);
    const decision: EvaluationDecision =
      blocking.length > 0 ? 'ECHOUE' : score >= passScore ? 'REUSSI' : 'ECHOUE';
    const levelBefore = program.levelFrom;
    const levelAfter = this.levelAfter(program, score, decision);

    const strengths = corrections
      .filter((item) => item.max > 0 && item.earned / item.max >= 0.8)
      .map((item) => `${item.label} : ${Math.round((item.earned / item.max) * 100)} %`);
    const gaps = [
      ...corrections
        .filter((item) => item.max > 0 && item.earned / item.max < 0.6)
        .map((item) => `${item.label} : ${Math.round((item.earned / item.max) * 100)} %`),
      ...blocking,
    ];

    const report: EvaluationReport = {
      id: `rep-${record.id}`,
      evaluationId: record.id,
      requestId,
      method: record.method,
      score,
      passScore,
      decision,
      criteria: corrections,
      strengths,
      gaps,
      blocking,
      feedback: corrections
        .filter((item) => item.comment)
        .map((item) => ({
          notion: item.label,
          detail: item.comment,
          advice:
            item.earned / Math.max(1, item.max) >= 0.8
              ? 'À consolider par la pratique régulière.'
              : 'À retravailler : reprenez les unités correspondantes avant un nouveau passage.',
        })),
      levelBefore,
      levelAfter,
      recommendations: this.recommendations(program, decision, gaps),
      at: new Date().toISOString(),
      attempt: record.attempt,
    };

    this.patchRecord(record.id, {
      answers,
      corrections,
      score,
      decision,
      status: 'CORRIGEE',
      submittedAt: new Date().toISOString(),
      correctedAt: new Date().toISOString(),
    });
    this._reports.update((reports) => [report, ...reports]);
    this.persistEvaluation();
    this.workflow.setEvaluationInProgress(false);
    this.audit.log({
      actor: 'Agent d’évaluation et de certification',
      action: 'Correction d’évaluation',
      target: record.id,
      detail: `Score ${score}/100 (seuil ${passScore}) — décision ${decision}.`,
    });

    return report;
  }

  private correct(
    method: EvaluationMethod,
    document: EvaluationDocument,
    answers: EvaluationAnswers,
  ): CriterionResult[] {
    switch (method) {
      case 'KNOWLEDGE_TEST':
        return this.correctKnowledgeTest(document as KnowledgeTestDocument, answers);
      case 'TECHNICAL_CHALLENGE':
        return this.correctTechnicalChallenge(document as TechnicalChallengeDocument, answers);
      case 'CASE_ANALYSIS':
        return this.correctCaseAnalysis(document as CaseAnalysisDocument, answers);
      case 'PROFESSIONAL_DOSSIER':
        return this.correctProfessionalDossier(document as ProfessionalDossierDocument, answers);
      case 'DEFENSE_INTERVIEW':
        return this.correctDefenseInterview(document as DefenseInterviewDocument, answers);
      default:
        return [];
    }
  }

  /**
   * Ratio de réussite d'une question du test de connaissances.
   *
   * Règle unique partagée par la correction et le contrôle des questions
   * éliminatoires : les deux ne peuvent pas diverger.
   */
  private knowledgeRatio(question: ExamQuestion, answer: AnswerValue | undefined): number {
    if (question.type === 'QCM' || question.type === 'TRUE_FALSE' || question.type === 'SCENARIO') {
      const picked = Array.isArray(answer) ? answer : [];
      const ok =
        picked.length === question.correctIndexes.length &&
        picked.every((value) => question.correctIndexes.includes(value));
      return ok ? 1 : 0;
    }
    if (question.type === 'MULTI') {
      const picked = Array.isArray(answer) ? answer : [];
      const hits = picked.filter((value) => question.correctIndexes.includes(value)).length;
      const wrong = picked.length - hits;
      return Math.max(0, (hits - wrong) / Math.max(1, question.correctIndexes.length));
    }
    const text = typeof answer === 'string' ? answer : '';
    // Règle affichée dans l'épreuve : une réponse non justifiée
    // (aucune notion attendue réellement couverte) ne rapporte aucun point.
    const covered = coverage(text, words(question.explanation).slice(0, 8));
    return text.trim().length < 40 ? 0 : covered >= 0.25 ? covered : 0;
  }

  /** Examen écrit : QCM exact, multi partiel, questions ouvertes par mots-clés. */
  private correctKnowledgeTest(
    document: KnowledgeTestDocument,
    answers: EvaluationAnswers,
  ): CriterionResult[] {
    return document.sections.map((section) => {
      let earned = 0;
      let max = 0;
      const notes: string[] = [];
      for (const question of section.questions) {
        max += question.points;
        const ratio = this.knowledgeRatio(question, answers[question.id]);
        earned += question.points * ratio;
        if (ratio < 0.7) {
          notes.push(question.explanation);
        }
      }
      return {
        id: section.id,
        label: section.title,
        weight: max,
        earned: Math.round(earned * 10) / 10,
        max,
        comment: notes.length === 0
          ? 'Section maîtrisée : aucune erreur significative.'
          : `Points à revoir : ${Array.from(new Set(notes)).slice(0, 2).join(' · ')}`,
      } satisfies CriterionResult;
    });
  }

  /**
   * Règles éliminatoires : une exigence bloquante non satisfaite invalide
   * l'épreuve, quel que soit le score.
   *
   * L'écran annonçait ces invalidations (« un critère éliminatoire non
   * satisfait invalide la tâche », « un dossier incomplet sur un critère
   * éliminatoire est refusé », « une erreur critique invalide la
   * soutenance ») : le correcteur ne les appliquait pas.
   */
  private blockingFailures(
    method: EvaluationMethod,
    document: EvaluationDocument,
    answers: EvaluationAnswers,
  ): string[] {
    const failures: string[] = [];

    if (method === 'KNOWLEDGE_TEST') {
      for (const section of (document as KnowledgeTestDocument).sections) {
        for (const question of section.questions) {
          if (question.critical !== true) {
            continue;
          }
          if (this.knowledgeRatio(question, answers[question.id]) < 0.7) {
            failures.push(`Question éliminatoire non maîtrisée : ${question.prompt}`);
          }
        }
      }
    }

    if (method === 'PROFESSIONAL_DOSSIER') {
      for (const requirement of (document as ProfessionalDossierDocument).requirements) {
        if (!requirement.mandatory) {
          continue;
        }
        const text =
          typeof answers[requirement.id] === 'string' ? String(answers[requirement.id]) : '';
        if (text.trim().length < 30) {
          failures.push(`Exigence obligatoire absente : ${requirement.label}`);
        }
      }
    }

    if (method === 'TECHNICAL_CHALLENGE') {
      for (const task of (document as TechnicalChallengeDocument).tasks) {
        const checked = Array.isArray(answers[task.id]) ? answers[task.id] as number[] : [];
        const missing = (task.blockingCriteria ?? []).filter((index) => !checked.includes(index));
        if (missing.length > 0) {
          const labels = missing
            .map((index) => task.successCriteria[index])
            .filter((label): label is string => !!label);
          failures.push(
            `Critère éliminatoire non satisfait pour la tâche « ${task.title} »${
              labels.length > 0 ? ` : ${labels.join(' · ')}` : ''
            }.`,
          );
        }
      }
    }

    if (method === 'DEFENSE_INTERVIEW') {
      for (const question of (document as DefenseInterviewDocument).questions) {
        if (question.blocking !== true) {
          continue;
        }
        const text =
          typeof answers[question.id] === 'string' ? String(answers[question.id]) : '';
        // Une réponse longue reste insuffisante si elle ne démontre aucune
        // des notions attendues. La longueur ne neutralise jamais une règle
        // éliminatoire.
        if (this.isRedFlag(text) || coverage(text, question.expectedThemes) < 0.25) {
          failures.push(`Maîtrise non démontrée sur une question fondamentale : ${question.prompt}`);
        }
      }
    }

    return failures;
  }

  /**
   * Réponse de non-maîtrise : trop courte, ou aveu d'ignorance.
   * Le texte est normalisé (accents retirés) : « aucune idée » doit être
   * détecté comme « je ne sais pas ».
   */
  private isRedFlag(text: string): boolean {
    const flat = normalise(text);
    return (
      flat.trim().length < 30 ||
      flat.includes('je ne sais pas') ||
      flat.includes('aucune idee') ||
      flat.includes('aucune connaissance')
    );
  }

  /**
   * Épreuve technique : critères réellement vérifiés, critère éliminatoire,
   * note d'exécution et journal des commandes transmis au correcteur.
   */
  private correctTechnicalChallenge(
    document: TechnicalChallengeDocument,
    answers: EvaluationAnswers,
  ): CriterionResult[] {
    return document.tasks.map((task) => {
      const answer = answers[task.id];
      const checked = Array.isArray(answer) ? answer : [];
      const total = task.successCriteria.length;
      const blockingCriteria = task.blockingCriteria ?? [];
      const missingBlocking = blockingCriteria.filter((index) => !checked.includes(index));
      const blockingSatisfied = missingBlocking.length === 0;
      const hintUsed = answers[`${task.id}::hint`] !== undefined;
      // Les indices sont annoncés comme réduisant le score de la tâche.
      const ratio = blockingSatisfied
        ? (checked.length / Math.max(1, total)) * (hintUsed ? 0.9 : 1)
        : 0;
      const earned = task.points * ratio;
      const note =
        typeof answers[`${task.id}::note`] === 'string' ? String(answers[`${task.id}::note`]) : '';
      const log =
        typeof answers[`${task.id}::log`] === 'string' ? String(answers[`${task.id}::log`]) : '';
      return {
        id: task.id,
        label: task.title,
        weight: task.points,
        earned: Math.round(earned * 10) / 10,
        max: task.points,
        comment: !blockingSatisfied
          ? `Critère éliminatoire non satisfait : ${missingBlocking
              .map((index) => task.successCriteria[index])
              .filter((label): label is string => !!label)
              .join(' · ')}. La tâche est invalidée.`
          : hintUsed
            ? 'Tâche conforme, mais un indice a été utilisé : score réduit.'
            : ratio >= 0.8
              ? 'Tâche conforme, résultat reproductible.'
              : `Critères manquants : ${task.successCriteria.filter((_, index) => !checked.includes(index)).slice(0, 2).join(' · ')}`,
        evidence: [note, log].filter((value) => value.trim().length > 0).join('\n'),
      } satisfies CriterionResult;
    });
  }

  /** Analyse de cas : raisonnement évalué thème par thème. */
  private correctCaseAnalysis(
    document: CaseAnalysisDocument,
    answers: EvaluationAnswers,
  ): CriterionResult[] {
    return document.questions.map((question) => {
      const text = typeof answers[question.id] === 'string' ? String(answers[question.id]) : '';
      // Seuil identique à celui affiché dans l'épreuve (60 caractères).
      // En dessous, ou sans aucun thème attendu couvert, la réponse ne
      // rapporte aucun point : une absence de raisonnement n'est pas une
      // réponse partielle.
      const ratio =
        text.trim().length < 60
          ? 0
          : coverage(text, question.expectedThemes) < 0.25
            ? 0
            : Math.min(1, 0.3 + 0.7 * coverage(text, question.expectedThemes));
      return {
        id: question.id,
        label: question.prompt,
        weight: question.points,
        earned: Math.round(question.points * ratio * 10) / 10,
        max: question.points,
        comment:
          ratio >= 0.8
            ? 'Raisonnement structuré, faits et hypothèses distingués.'
            : `Thèmes attendus non couverts : ${question.expectedThemes.join(' · ')}`,
      } satisfies CriterionResult;
    });
  }

  /** Dossier professionnel : dépôt pondéré + entretien de vérification. */
  private correctProfessionalDossier(
    document: ProfessionalDossierDocument,
    answers: EvaluationAnswers,
  ): CriterionResult[] {
    const requirements = document.requirements.map((requirement) => {
      const text =
        typeof answers[requirement.id] === 'string' ? String(answers[requirement.id]) : '';
      const present = text.trim().length >= 30;
      const ratio = present
        ? Math.min(1, 0.7 + 0.3 * coverage(text, words(requirement.description)))
        : 0;
      return {
        id: requirement.id,
        label: requirement.label,
        // Seules les deux synthèses pondérées comptent dans le score.
        weight: 0,
        earned: Math.round(requirement.weight * ratio * 10) / 10,
        max: requirement.weight,
        comment: present
          ? requirement.mandatory
            ? 'Exigence obligatoire couverte.'
            : 'Exigence complémentaire couverte.'
          : requirement.mandatory
            ? 'Exigence obligatoire absente : dossier incomplet.'
            : 'Exigence complémentaire absente.',
      } satisfies CriterionResult;
    });

    const defense = document.defenseQuestions.map((question, index) => {
      const text =
        typeof answers[question.id] === 'string' ? String(answers[question.id]) : '';
      const ratio =
        text.trim().length < 40 ? 0 : Math.min(1, 0.4 + 0.6 * coverage(text, question.expectedThemes));
      const max = index === 0 ? 10 : 5;
      return {
        id: question.id,
        label: `Entretien : ${question.prompt}`,
        // Ligne de détail : seule la synthèse « dossier-defense » (15 %) compte.
        weight: 0,
        earned: Math.round(max * ratio * 10) / 10,
        max,
        comment:
          ratio >= 0.8
            ? 'Paternité et maîtrise confirmées.'
            : 'Réponse trop générale : la maîtrise du dossier n’est pas démontrée.',
      } satisfies CriterionResult;
    });

    const dossierMax = requirements.reduce((sum, item) => sum + item.max, 0);
    const dossierEarned = requirements.reduce((sum, item) => sum + item.earned, 0);
    const dossierPercent = dossierMax === 0 ? 0 : (dossierEarned / dossierMax) * 100;
    const defenseMax = defense.reduce((sum, item) => sum + item.max, 0);
    const defenseEarned = defense.reduce((sum, item) => sum + item.earned, 0);
    const defensePercent = defenseMax === 0 ? 0 : (defenseEarned / defenseMax) * 100;

    return [
      ...requirements,
      {
        id: 'dossier-global',
        label: 'Dossier complet (pondération 85 %)',
        weight: 85,
        earned: Math.round(dossierPercent * 0.85 * 10) / 10,
        max: 85,
        comment:
          dossierPercent >= 80
            ? 'Dossier autonome et reproductible.'
            : 'Le dossier ne permet pas encore une reprise par un pair.',
      },
      {
        id: 'dossier-defense',
        label: 'Entretien de vérification (15 %)',
        weight: 15,
        earned: Math.round(defensePercent * 0.15 * 10) / 10,
        max: 15,
        comment:
          defensePercent >= 70
            ? 'Le candidat sait défendre ses choix.'
            : 'Les choix du dossier ne sont pas suffisamment justifiés à l’oral.',
      },
    ];
  }

  /** Soutenance : couverture des thèmes, relances, contre-exemples, drapeaux rouges. */
  private correctDefenseInterview(
    document: DefenseInterviewDocument,
    answers: EvaluationAnswers,
  ): CriterionResult[] {
    const results = document.questions.map((question) => {
      const text = typeof answers[question.id] === 'string' ? String(answers[question.id]) : '';
      const redFlag = this.isRedFlag(text);
      // Un fond de réponse hors sujet ne vaut pas de point : la maîtrise
      // doit être démontrée, pas affirmée.
      const ratio =
        redFlag || coverage(text, question.expectedThemes) < 0.25
          ? 0
          : Math.min(1, 0.25 + 0.75 * coverage(text, question.expectedThemes));
      return {
        id: question.id,
        label: `${DEFENSE_QUESTION_KIND_LABELS[question.kind]} — ${question.prompt}`,
        weight: 0,
        earned: Math.round(question.points * ratio * 10) / 10,
        max: question.points,
        comment: redFlag
          ? `Réponse insuffisante : le jury ne peut pas conclure à la maîtrise.${question.redFlags.length > 0 ? ` Signaux attendus : ${question.redFlags.slice(0, 2).join(' · ')}.` : ''}`
          : ratio >= 0.8
            ? 'Réponse étayée, limites reconnues.'
            : 'Réponse partielle : notions attendues non explicitées.',
      } satisfies CriterionResult;
    });

    const max = results.reduce((sum, item) => sum + item.max, 0);
    const earned = results.reduce((sum, item) => sum + item.earned, 0);
    return [
      ...results,
      {
        id: 'defense-global',
        label: 'Grille d’entretien normalisée',
        weight: 100,
        earned: Math.round((earned / Math.max(1, max)) * 100 * 10) / 10,
        max: 100,
        comment: 'Synthèse du jury sur l’ensemble de l’entretien.',
      },
    ];
  }

  /* ---------------------------------------------------------------- *
   * Décisions et rapports
   * ---------------------------------------------------------------- */

  private levelAfter(
    program: TrainingProgram,
    score: number,
    decision: EvaluationDecision,
  ): number {
    const span = program.levelTo - program.levelFrom;
    const gain = decision === 'REUSSI' ? span * (score / 100) : span * (score / 100) * 0.5;
    return round(program.levelFrom + gain);
  }

  private recommendations(
    program: TrainingProgram,
    decision: EvaluationDecision,
    gaps: string[],
  ): EvaluationReport['recommendations'] {
    if (decision === 'REUSSI') {
      return [
        {
          title: `Approfondir ${program.skillLabel} sur un cas plus complexe`,
          skillCode: program.skillCode,
          skillLabel: program.skillLabel,
          reason:
            'La maîtrise est démontrée sur le périmètre de la formation. Un cas plus complexe consoliderait le niveau atteint.',
          formats: ['PROJECT', 'SIMULATION'],
          estimatedHours: 12,
          levelFrom: program.levelTo,
          levelTo: Math.min(100, program.levelTo + 10),
        },
      ];
    }
    return [
      {
        title: `Remédiation ciblée — ${program.skillLabel}`,
        skillCode: program.skillCode,
        skillLabel: program.skillLabel,
        reason:
          gaps.length > 0
            ? `Points faibles identifiés : ${gaps.slice(0, 2).join(' · ')}. Une nouvelle formation est nécessaire avant un nouveau passage.`
            : 'Le seuil de réussite n’est pas atteint. Une nouvelle formation est nécessaire.',
        formats: [program.format, 'PRACTICAL'],
        estimatedHours: Math.max(6, Math.round(program.estimatedHours * 0.6)),
        levelFrom: program.levelFrom,
        levelTo: program.levelTo,
      },
    ];
  }

  private durationLabel(document: EvaluationDocument): string {
    if ('durationMinutes' in document) {
      return `${document.durationMinutes} minutes`;
    }
    return `${document.submissionDays} jours de production`;
  }

  private patchRecord(id: string, patch: Partial<EvaluationRecord>): void {
    this._records.update((records) =>
      records.map((record) => (record.id === id ? { ...record, ...patch } : record)),
    );
    this.persistEvaluation();
  }

  /** Rend immédiatement l'évaluation durable dans le stockage local. */
  private persistEvaluation(): void {
    this.store.write('evaluation.records', this._records());
    this.store.write('evaluation.reports', this._reports());
    this.store.write('evaluation.drafts', this._drafts());
  }

  /** Efface les évaluations d'un collaborateur sans toucher aux autres espaces. */
  clearEmployee(employeeId: string): void {
    const evaluationIds = new Set(
      this._records()
        .filter((record) => record.employeeId === employeeId)
        .map((record) => record.id),
    );
    this._records.update((records) =>
      records.filter((record) => record.employeeId !== employeeId),
    );
    this._reports.update((reports) =>
      reports.filter((report) => !evaluationIds.has(report.evaluationId)),
    );
    this._drafts.update((drafts) => {
      const next = { ...drafts };
      for (const evaluationId of evaluationIds) {
        delete next[evaluationId];
      }
      return next;
    });
    this.persistEvaluation();
  }

  reset(): void {
    this._records.set([]);
    this._reports.set([]);
    this._drafts.set({});
    this.persistEvaluation();
  }

  /** Réponse brute normalisée, utile aux écrans. */
  answerOf(answers: EvaluationAnswers, id: string): AnswerValue {
    return answers[id] ?? '';
  }
}
