import { computed, inject, Injectable, signal } from '@angular/core';
import {
  Certificate,
  EVALUATION_METHOD_LABELS,
  EvaluationReport,
  TrainingFormat,
} from '../models';
import { AuditService } from './audit.service';
import { CollectionService } from './collection.service';
import { EvaluationService } from './evaluation.service';
import { GapService } from './gap.service';
import { INITIAL_CERTIFICATES } from './mock-data';
import { NotificationService } from './notification.service';
import { ProfileService } from './profile.service';
import { TrainingService } from './training.service';

/**
 * Domaine Certification — étanche.
 *
 * Un certificat n'existe QUE si une évaluation a été réussie. En cas
 * d'échec, ce service ne produit rien : il déclenche une remédiation dans
 * le domaine Formation. Aucun contenu de formation ou d'évaluation n'est
 * dupliqué ici.
 */
@Injectable({ providedIn: 'root' })
export class CertificationService {
  private readonly evaluations = inject(EvaluationService);
  private readonly training = inject(TrainingService);
  private readonly collection = inject(CollectionService);
  private readonly profileService = inject(ProfileService);
  private readonly gaps = inject(GapService);
  private readonly notifications = inject(NotificationService);
  private readonly audit = inject(AuditService);

  private readonly _certificates = signal<Certificate[]>([...INITIAL_CERTIFICATES]);
  readonly certificates = this._certificates.asReadonly();

  readonly issued = computed(() =>
    [...this._certificates()].sort((a, b) => b.issuedAt.localeCompare(a.issuedAt)),
  );

  readonly total = computed(() => this._certificates().length);

  forRequest(requestId: string): Certificate | undefined {
    return this._certificates().find((certificate) => certificate.requestId === requestId);
  }

  byId(id: string): Certificate | undefined {
    return this._certificates().find((certificate) => certificate.id === id);
  }

  forEmployee(employeeId: string): Certificate[] {
    return this._certificates().filter((certificate) => certificate.employeeId === employeeId);
  }

  /**
   * Clôture le cycle après correction.
   * - réussite  → certificat + niveau certifié + écart recalculé
   * - échec     → aucun certificat + remédiation en formation
   */
  finalize(evaluationId: string): {
    outcome: 'CERTIFIED' | 'REMEDIATION' | 'ALREADY' | 'UNKNOWN';
    certificate?: Certificate;
    report?: EvaluationReport;
  } {
    const record = this.evaluations.records().find((item) => item.id === evaluationId);
    if (!record) {
      return { outcome: 'UNKNOWN' };
    }
    const existing = this.forRequest(record.requestId);
    if (existing) {
      return { outcome: 'ALREADY', certificate: existing, report: this.evaluations.reportFor(evaluationId) };
    }
    const report = this.evaluations.reportFor(evaluationId);
    const request = this.training.requestById(record.requestId);
    const program = this.training.programFor(record.requestId);
    if (!report || !request || !program) {
      return { outcome: 'UNKNOWN' };
    }

    this.training.attachEvaluation(record.requestId, record.id);

    if (report.decision === 'REUSSI') {
      const certificate = this.issue(record.requestId, record.id, report, program.format);
      this.collection.recordEvaluationResult({
        requestId: record.requestId,
        evaluationId: record.id,
        methodLabel: EVALUATION_METHOD_LABELS[record.method],
        skillCode: request.skillCode,
        skillLabel: request.skillLabel,
        levelAfter: report.levelAfter,
        passed: true,
        score: report.score,
        note: `Certificat ${certificate.id} délivré.`,
      });
      this.training.attachCertificate(record.requestId, certificate.id);
      this.notifications.notify({
        type: 'CERTIFICATE_ISSUED',
        title: `Certificat délivré : ${certificate.skillLabel}`,
        message: `${EVALUATION_METHOD_LABELS[record.method]} réussi avec ${report.score}/100. Niveau ${report.levelBefore} → ${report.levelAfter}.`,
        audience: ['EMPLOYEE', 'MANAGER', 'RH'],
        link: `/app/certificats/${certificate.id}`,
        employeeId: request.employeeId,
      });
      this.audit.log({
        actor: 'Assessment & Certification Agent',
        action: 'Délivrance de certificat',
        target: certificate.id,
        detail: `${certificate.formationTitle} — ${report.score}/100, niveau ${report.levelBefore} → ${report.levelAfter}.`,
      });
      return { outcome: 'CERTIFIED', certificate, report };
    }

    // Échec : pas de certificat. La remédiation repart dans Formation.
    this.collection.recordEvaluationResult({
      requestId: record.requestId,
      evaluationId: record.id,
      methodLabel: EVALUATION_METHOD_LABELS[record.method],
      skillCode: request.skillCode,
      skillLabel: request.skillLabel,
      levelAfter: report.levelAfter,
      passed: false,
      score: report.score,
      note: `Seuil ${report.passScore} non atteint.`,
    });

    const remediation = this.training.createRemediation({
      previousRequestId: record.requestId,
      skillCode: request.skillCode,
      skillLabel: request.skillLabel,
      subject: request.subject,
      gapId: request.gapId,
      levelFrom: report.levelAfter,
      levelTo: request.levelTo,
      format: program.format,
      reason: `Score ${report.score}/100, inférieur au seuil de ${report.passScore}.`,
    });

    this.notifications.notify({
      type: 'EVALUATION_FAILED',
      title: `Évaluation non réussie : ${record.employeeName}`,
      message: `${EVALUATION_METHOD_LABELS[record.method]} — ${report.score}/100 (seuil ${report.passScore}). Aucun certificat émis. Une remédiation ${remediation ? remediation.id : ''} a été créée.`,
      audience: ['EMPLOYEE', 'MANAGER'],
      link: remediation ? `/app/validations/${remediation.id}` : `/app/evaluations/${record.requestId}`,
      employeeId: record.employeeId,
    });

    this.audit.log({
      actor: 'Assessment & Certification Agent',
      action: 'Échec d’évaluation',
      target: record.id,
      detail: `Score ${report.score}/100 < ${report.passScore}. Aucun certificat. Remédiation créée.`,
    });

    return { outcome: 'REMEDIATION', report };
  }

  private issue(
    requestId: string,
    evaluationId: string,
    report: EvaluationReport,
    format: TrainingFormat,
  ): Certificate {
    const request = this.training.requestById(requestId);
    const program = this.training.programFor(requestId);
    const year = new Date().getFullYear();
    const serial = String(this._certificates().length + 1).padStart(6, '0');

    const certificate: Certificate = {
      id: `WA-${year}-${serial}`,
      requestId,
      trainingId: program?.id ?? request?.trainingId ?? '',
      evaluationId,
      employeeId: request?.employeeId ?? 'emp-0001',
      employeeName: request?.employeeName ?? this.profileService.fullName(),
      formationTitle: program?.title ?? request?.skillLabel ?? 'Parcours certifié',
      skillLabel: request?.skillLabel ?? '',
      method: report.method,
      score: report.score,
      levelBefore: report.levelBefore,
      levelAfter: report.levelAfter,
      criteriaValidated: report.criteria
        .filter((criterion) => criterion.max > 0 && criterion.earned / criterion.max >= 0.8)
        .map((criterion) => criterion.label),
      issuedAt: new Date().toISOString().slice(0, 10),
      format,
    };

    this._certificates.update((certificates) => [certificate, ...certificates]);

    this.profileService.updateSkillLevel({
      code: request?.skillCode ?? '',
      level: report.levelAfter,
      cause: 'EVALUATION',
      evidenceIds: [`ev-cert-${certificate.id}`],
      confidence: 0.95,
      source: 'CERTIFIED',
    });

    return certificate;
  }
}
