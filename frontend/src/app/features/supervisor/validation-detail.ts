import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  EVALUATION_METHOD_LABELS,
  FORMAT_LABELS,
  TRAINING_REQUEST_STATUS_LABELS,
} from '../../core/models';
import { DataService } from '../../core/data/data.service';
import { capstoneOf, programUnits } from '../../core/data/training/helpers';

@Component({
  selector: 'wa-validation-detail',
  imports: [RouterLink],
  styleUrl: '../pages.scss',
  template: `
    @if (request(); as req) {
      <div class="page">
        <header class="page-head">
          <div>
            <a class="wa-small" routerLink="/app/validations" style="color: var(--wa-primary-deep); font-weight: 600">
              ← Validations
            </a>
            <h1 style="margin-top: 6px">{{ program()?.title ?? req.subject }}</h1>
            <p>
              {{ req.employeeName }} · {{ formatLabels[req.format] }} ·
              {{ req.skillLabel }} · niveau {{ req.levelFrom }} → {{ req.levelTo }}/100
            </p>
          </div>
          <div class="page-head__actions">
            <span class="wa-chip" [class]="statusClass(req.status)">{{ statusLabels[req.status] }}</span>
            <a class="btn" [routerLink]="['/app/formations', req.id]">
              <span class="material-symbols-outlined">open_in_new</span>
              Vue employé
            </a>
          </div>
        </header>

        @if (message()) {
          <p class="note" [class.note--ok]="messageOk()" [class.note--danger]="!messageOk()">{{ message() }}</p>
        }

        <div class="stat-grid">
          <div class="stat">
            <span>Volume</span>
            <strong>{{ program()?.estimatedHours ?? 0 }} h</strong>
            <small>{{ units().length }} unités · {{ program()?.estimatedDays ?? 0 }} jours</small>
          </div>
          <div class="stat">
            <span>Durée minimale exigée</span>
            <strong>{{ minHours() }} h</strong>
            <small>Aucune validation en quelques minutes</small>
          </div>
          <div class="stat">
            <span>Seuil d’évaluation</span>
            <strong>{{ program()?.completion?.passScore ?? 75 }}/100</strong>
            <small>Défini par cette formation</small>
          </div>
          <div class="stat">
            <span>Preuve de fin</span>
            <strong style="font-size: 14px">{{ capstone()?.title }}</strong>
            <small>Obligatoire avant l’évaluation</small>
          </div>
        </div>

        <div class="split">
          <div style="display: flex; flex-direction: column; gap: 18px">
            <section class="panel">
              <h2>Objet du parcours</h2>
              <p class="panel__sub">{{ program()?.summary }}</p>
              <p class="note note--info" style="margin: 0 0 12px">{{ req.objective }}</p>
              <h3 class="sub">Objectifs opérationnels</h3>
              <ul class="bullets">
                @for (objective of program()?.objectives ?? []; track objective) {
                  <li>{{ objective }}</li>
                }
              </ul>
            </section>

            <section class="panel">
              <div class="toolbar" style="margin-bottom: 10px">
                <h2 style="margin: 0">Curriculum complet</h2>
                <div class="toolbar__spacer"></div>
                <span class="wa-small wa-muted">{{ units().length }} unités · {{ totalMinutes() }} min</span>
              </div>
              <p class="panel__sub">
                Tous les contenus sont visibles. En mode modification, cochez les unités à
                retirer : le volume et les critères de fin seront recalculés réellement.
              </p>
              <div class="units">
                @for (unit of units(); track unit.id; let i = $index) {
                  <div class="unit" [class.unit--removed]="removed().includes(unit.id)">
                    @if (canDecide() && mode() === 'modify') {
                      <input
                        type="checkbox"
                        [checked]="removed().includes(unit.id)"
                        (change)="toggleUnit(unit.id)"
                        [attr.aria-label]="'Retirer ' + unit.title"
                      />
                    } @else {
                      <span class="unit__num">{{ i + 1 }}</span>
                    }
                    <div class="unit__body">
                      <strong>{{ unit.title }}</strong>
                      <small>{{ unit.kind }} · {{ unit.minutes }} min</small>
                    </div>
                    @if (removed().includes(unit.id)) {
                      <span class="wa-chip wa-chip--danger">Retirée</span>
                    }
                  </div>
                }
              </div>

              <h3 class="sub">Plan d’étude</h3>
              <div class="plan">
                @for (session of program()?.studyPlan ?? []; track session.id) {
                  <div class="plan__row">
                    <span class="plan__day">{{ session.day }}</span>
                    <div>
                      <strong>{{ session.label }} · {{ session.minutes }} min</strong>
                      <small>{{ session.focus }}</small>
                    </div>
                  </div>
                }
              </div>
            </section>

            <section class="panel">
              <h2>Conditions de fin réelles</h2>
              <div class="conditions">
                <div class="condition">
                  <span class="material-symbols-outlined">schedule</span>
                  <div>
                    <strong>{{ minHours() }} h de travail minimum</strong>
                    <small>Le temps est crédité par unité réellement terminée.</small>
                  </div>
                </div>
                <div class="condition">
                  <span class="material-symbols-outlined">checklist</span>
                  <div>
                    <strong>{{ program()?.completion?.requiredUnits ?? units().length }} unités obligatoires</strong>
                    <small>Toutes les unités doivent être validées.</small>
                  </div>
                </div>
                <div class="condition">
                  <span class="material-symbols-outlined">flag</span>
                  <div>
                    <strong>Points de contrôle formatifs</strong>
                    <small>{{ program()?.completion?.requireAllCheckpoints ? 'Tous exigés' : 'Non exigés' }} · remédiation avant passage.</small>
                  </div>
                </div>
                <div class="condition">
                  <span class="material-symbols-outlined">workspace_premium</span>
                  <div>
                    <strong>Preuve de fin — {{ program()?.completion?.evidenceLabel }}</strong>
                    <small>{{ capstone()?.deliverable }}</small>
                  </div>
                </div>
              </div>
            </section>

            <section class="panel">
              <h2>Activités complémentaires et évaluation</h2>
              <p class="panel__sub">
                Au maximum deux activités complémentaires, rendues dans leur format natif. Elles
                ne remplacent jamais le format dominant.
              </p>
              <div class="comp">
                @for (activity of program()?.complementary ?? []; track activity.id) {
                  <div class="comp__item">
                    <span class="wa-chip wa-chip--neutral">{{ formatLabels[activity.format] }}</span>
                    <div>
                      <strong>{{ activity.title }}</strong>
                      <small>{{ activity.rationale }} · {{ activity.minutes }} min</small>
                    </div>
                  </div>
                }
                @if ((program()?.complementary ?? []).length === 0) {
                  <p class="empty">Aucune activité complémentaire pour ce parcours.</p>
                }
              </div>
              <h3 class="sub">Évaluations recommandées (l’employé choisit)</h3>
              <div class="chips">
                @for (method of program()?.recommendedEvaluation ?? []; track method) {
                  <span class="wa-chip wa-chip--info">{{ methodLabels[method] }}</span>
                }
              </div>
            </section>
          </div>

          <aside style="display: flex; flex-direction: column; gap: 18px">
            <section class="panel decision">
              <h2>Décision du superviseur</h2>
              @if (!canDecide()) {
                <p class="note note--info">
                  Ce parcours a déjà reçu une décision. Elle est conservée et ne peut pas être
                  réécrite silencieusement.
                </p>
                <div class="kv-grid" style="margin-top: 10px">
                  <div class="kv">
                    <span>Statut</span>
                    <strong>{{ statusLabels[req.status] }}</strong>
                  </div>
                  <div class="kv">
                    <span>Décidé le</span>
                    <strong>{{ req.decidedAt ? day(req.decidedAt) : '—' }}</strong>
                  </div>
                </div>
                @if (req.supervisorNote) {
                  <p class="note" style="margin-top: 10px">{{ req.supervisorNote }}</p>
                }
                @if (req.modification; as mod) {
                  <p class="wa-small wa-muted" style="margin-top: 8px">
                    {{ mod.removedUnits.length }} unité(s) retirée(s) · {{ mod.adjustedHours ?? program()?.estimatedHours }} h
                    · {{ day(mod.at) }}
                  </p>
                }
              } @else {
                <div class="modes">
                  <button type="button" class="mode" [class.mode--on]="mode() === 'approve'" (click)="mode.set('approve')">
                    <span class="material-symbols-outlined">check_circle</span>
                    Approuver
                  </button>
                  <button type="button" class="mode" [class.mode--on]="mode() === 'modify'" (click)="mode.set('modify')">
                    <span class="material-symbols-outlined">edit_note</span>
                    Modifier
                  </button>
                  <button type="button" class="mode" [class.mode--on]="mode() === 'reject'" (click)="mode.set('reject')">
                    <span class="material-symbols-outlined">block</span>
                    Rejeter
                  </button>
                </div>

                @switch (mode()) {
                  @case ('approve') {
                    <p class="panel__sub" style="margin: 12px 0 8px">
                      Vous validez le curriculum tel qu’il est présenté. L’employé pourra démarrer
                      immédiatement.
                    </p>
                    <label class="wa-field">
                      <span class="wa-field__label">Note de validation (facultative)</span>
                      <textarea class="wa-textarea" rows="3" [value]="note()" (input)="note.set($any($event.target).value)" placeholder="Ex. Parcours cohérent avec l’écart détecté ; priorité sur l’atelier de restauration."></textarea>
                    </label>
                    <button class="btn btn--primary" type="button" style="width: 100%; margin-top: 10px" (click)="approve()">
                      <span class="material-symbols-outlined">verified</span>
                      Approuver le parcours complet
                    </button>
                  }
                  @case ('modify') {
                    <p class="panel__sub" style="margin: 12px 0 8px">
                      Cochez les unités à retirer puis justifiez. La durée et les critères de fin
                      sont recalculés : ce n’est pas un simple commentaire.
                    </p>
                    <div class="mod-summary">
                      <span>{{ removed().length }} unité(s) retirée(s)</span>
                      <span>{{ remainingMinutes() }} min restantes</span>
                    </div>
                    <label class="wa-field" style="margin-top: 10px">
                      <span class="wa-field__label">Durée ajustée (heures, facultatif)</span>
                      <input class="wa-input" type="number" min="4" max="40" [value]="adjustedHours() ?? ''" (input)="adjustedHours.set(+$any($event.target).value || null)" placeholder="Ex. 12" />
                    </label>
                    <label class="wa-field" style="margin-top: 10px">
                      <span class="wa-field__label">Motif de la modification (obligatoire)</span>
                      <textarea class="wa-textarea" rows="3" [value]="note()" (input)="note.set($any($event.target).value)" placeholder="Ex. Retirer les unités déjà maîtrisées et recentrer sur la fiabilité de livraison."></textarea>
                    </label>
                    <button class="btn btn--primary" type="button" style="width: 100%; margin-top: 10px" [disabled]="removed().length === 0 && !adjustedHours()" (click)="modify()">
                      <span class="material-symbols-outlined">edit_document</span>
                      Appliquer la modification
                    </button>
                  }
                  @case ('reject') {
                    <p class="panel__sub" style="margin: 12px 0 8px">
                      Le rejet exige un motif écrit. L’écart sera rouvert et une nouvelle
                      génération restera possible.
                    </p>
                    <label class="wa-field">
                      <span class="wa-field__label">Motif du rejet (obligatoire)</span>
                      <textarea class="wa-textarea" rows="4" [value]="reason()" (input)="reason.set($any($event.target).value)" placeholder="Ex. Le parcours ne cible pas l’écart réel : l’évaluation doit porter sur la stratégie de test, pas sur les commandes Docker."></textarea>
                    </label>
                    <button class="btn btn--danger" type="button" style="width: 100%; margin-top: 10px" [disabled]="reason().trim().length < 10" (click)="reject()">
                      <span class="material-symbols-outlined">cancel</span>
                      Rejeter avec ce motif
                    </button>
                  }
                }
              }
            </section>

            <section class="panel">
              <h2>Traçabilité</h2>
              <div class="kv-grid">
                <div class="kv">
                  <span>Demandé le</span>
                  <strong>{{ day(req.requestedAt) }}</strong>
                </div>
                <div class="kv">
                  <span>Écart</span>
                  <strong>{{ req.skillLabel }}</strong>
                </div>
                <div class="kv">
                  <span>Origine</span>
                  <strong>{{ req.origin === 'REMEDIATION' ? 'Remédiation' : 'Écart détecté' }}</strong>
                </div>
                <div class="kv">
                  <span>Généré avant validation</span>
                  <strong>Oui</strong>
                </div>
              </div>
              <div class="audit">
                @for (entry of audit(); track entry.id) {
                  <div class="audit__row">
                    <strong>{{ entry.action }}</strong>
                    <p>{{ entry.detail }}</p>
                    <small>{{ entry.actor }} · {{ when(entry.at) }}</small>
                  </div>
                }
                @if (audit().length === 0) {
                  <p class="wa-small wa-muted" style="margin: 10px 0 0">
                    Aucune décision enregistrée pour l’instant.
                  </p>
                }
              </div>
            </section>
          </aside>
        </div>
      </div>
    } @else {
      <div class="page">
        <p class="empty">
          Parcours introuvable. <a routerLink="/app/validations">Retour aux validations</a>
        </p>
      </div>
    }
  `,
  styles: [
    `
      .bullets {
        margin: 0;
        padding-left: 18px;
        font-size: 12.5px;
        line-height: 1.65;
        color: var(--wa-ink-soft);
      }
      .units {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .unit {
        display: flex;
        gap: 10px;
        align-items: center;
        padding: 9px 11px;
        border-radius: 10px;
        border: 1px solid var(--wa-border);
        background: #fff;
      }
      .unit--removed {
        background: #fdf5f4;
        border-color: #f0c9c5;
      }
      .unit--removed strong {
        text-decoration: line-through;
        color: var(--wa-ink-soft);
      }
      .unit input {
        margin: 0;
      }
      .unit__num {
        width: 24px;
        height: 24px;
        flex: none;
        border-radius: 7px;
        background: var(--wa-surface-3);
        display: grid;
        place-items: center;
        font-size: 10.5px;
        font-weight: 700;
      }
      .unit__body {
        flex: 1;
      }
      .unit__body strong {
        display: block;
        font-size: 12.5px;
      }
      .unit__body small {
        font-size: 10.5px;
        color: var(--wa-ink-soft);
      }
      .plan {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .plan__row {
        display: flex;
        gap: 10px;
        align-items: flex-start;
        padding: 8px 10px;
        border-radius: 9px;
        background: var(--wa-surface-2);
      }
      .plan__day {
        flex: none;
        width: 130px;
        font-size: 11px;
        font-weight: 700;
        color: var(--wa-primary-deep);
      }
      .plan__row strong {
        display: block;
        font-size: 12px;
      }
      .plan__row small {
        font-size: 10.5px;
        color: var(--wa-ink-soft);
      }
      .conditions {
        display: grid;
        gap: 8px;
      }
      .condition {
        display: flex;
        gap: 10px;
        align-items: flex-start;
        padding: 10px 12px;
        border-radius: 10px;
        background: var(--wa-surface-2);
      }
      .condition .material-symbols-outlined {
        color: var(--wa-primary);
        font-size: 20px;
      }
      .condition strong {
        display: block;
        font-size: 12.5px;
      }
      .condition small {
        font-size: 10.5px;
        line-height: 1.45;
        color: var(--wa-ink-soft);
      }
      .comp {
        display: flex;
        flex-direction: column;
        gap: 7px;
      }
      .comp__item {
        display: flex;
        gap: 9px;
        align-items: flex-start;
        padding: 9px 11px;
        border-radius: 10px;
        border: 1px dashed var(--wa-border-strong);
      }
      .comp__item strong {
        display: block;
        font-size: 12px;
      }
      .comp__item small {
        font-size: 10.5px;
        color: var(--wa-ink-soft);
      }
      .decision {
        border-top: 4px solid var(--wa-primary);
        position: sticky;
        top: 88px;
      }
      .modes {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 6px;
        margin-top: 10px;
      }
      .mode {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 3px;
        padding: 9px 4px;
        border-radius: 10px;
        border: 1px solid var(--wa-border);
        background: #fff;
        font-size: 10.5px;
        font-weight: 600;
        cursor: pointer;
      }
      .mode--on {
        border-color: var(--wa-primary);
        background: var(--wa-primary-soft);
        color: var(--wa-primary-deep);
      }
      .mod-summary {
        display: flex;
        justify-content: space-between;
        gap: 10px;
        padding: 8px 11px;
        border-radius: 9px;
        background: var(--wa-surface-2);
        font-size: 11.5px;
        font-weight: 600;
      }
      .audit {
        margin-top: 12px;
        padding-top: 10px;
        border-top: 1px dashed var(--wa-border);
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .audit__row strong {
        font-size: 12px;
      }
      .audit__row p {
        margin: 2px 0;
        font-size: 11.5px;
        line-height: 1.45;
        color: var(--wa-ink-soft);
      }
      .audit__row small {
        font-size: 10px;
        color: var(--wa-ink-faint);
      }
      @media (max-width: 1000px) {
        .decision {
          position: static;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ValidationDetail {
  private readonly data = inject(DataService);
  private readonly router = inject(Router);

  readonly requestId = input.required<string>();

  readonly request = computed(() => this.data.requestById(this.requestId()));
  readonly program = computed(() => this.data.programFor(this.requestId()));
  readonly units = computed(() => {
    const program = this.program();
    return program ? programUnits(program) : [];
  });
  readonly capstone = computed(() => {
    const program = this.program();
    return program ? capstoneOf(program) : undefined;
  });
  readonly audit = computed(() => this.data.auditFor(this.requestId()));

  readonly statusLabels = TRAINING_REQUEST_STATUS_LABELS;
  readonly formatLabels = FORMAT_LABELS;
  readonly methodLabels = EVALUATION_METHOD_LABELS;

  readonly mode = signal<'approve' | 'modify' | 'reject'>('approve');
  readonly note = signal('');
  readonly reason = signal('');
  readonly removed = signal<string[]>([]);
  readonly adjustedHours = signal<number | null>(null);

  readonly message = signal('');
  readonly messageOk = signal(true);

  readonly minHours = computed(() => {
    const completion = this.program()?.completion;
    return completion ? Math.round(completion.minMinutes / 60) : 0;
  });

  readonly totalMinutes = computed(() =>
    this.units().reduce((sum, unit) => sum + unit.minutes, 0),
  );

  readonly remainingMinutes = computed(() =>
    this.units()
      .filter((unit) => !this.removed().includes(unit.id))
      .reduce((sum, unit) => sum + unit.minutes, 0),
  );

  canDecide(): boolean {
    return this.request()?.status === 'PENDING';
  }

  toggleUnit(unitId: string): void {
    this.removed.update((list) =>
      list.includes(unitId) ? list.filter((id) => id !== unitId) : [...list, unitId],
    );
  }

  approve(): void {
    this.data.approveTraining(this.requestId(), this.note().trim());
    this.message.set('Parcours approuvé. L’employé peut démarrer ; la collecte continue.');
    this.messageOk.set(true);
    void this.router.navigate(['/app/validations']);
  }

  modify(): void {
    if (this.removed().length === 0 && !this.adjustedHours()) {
      this.message.set('Sélectionnez au moins une unité à retirer ou ajustez la durée.');
      this.messageOk.set(false);
      return;
    }
    if (!this.note().trim()) {
      this.message.set('Le motif de modification est obligatoire.');
      this.messageOk.set(false);
      return;
    }
    this.data.modifyTraining({
      requestId: this.requestId(),
      note: this.note().trim(),
      removedUnitIds: this.removed(),
      adjustedHours: this.adjustedHours() ?? undefined,
    });
    this.message.set(
      `Modification appliquée : ${this.removed().length} unité(s) retirée(s), curriculum recalculé.`,
    );
    this.messageOk.set(true);
    void this.router.navigate(['/app/validations']);
  }

  reject(): void {
    if (this.reason().trim().length < 10) {
      this.message.set('Un motif de rejet explicite est obligatoire (10 caractères minimum).');
      this.messageOk.set(false);
      return;
    }
    this.data.rejectTraining(this.requestId(), this.reason().trim());
    this.message.set('Parcours rejeté avec motif horodaté. L’écart a été rouvert.');
    this.messageOk.set(true);
    void this.router.navigate(['/app/validations']);
  }

  statusClass(status: string): string {
    switch (status) {
      case 'APPROVED':
      case 'COMPLETED':
        return 'wa-chip wa-chip--success';
      case 'PENDING':
      case 'CHANGES_REQUESTED':
        return 'wa-chip wa-chip--warning';
      case 'IN_PROGRESS':
        return 'wa-chip wa-chip--info';
      case 'REJECTED':
      case 'CANCELLED':
        return 'wa-chip wa-chip--danger';
      default:
        return 'wa-chip wa-chip--neutral';
    }
  }

  day(value: string): string {
    return new Date(value).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  when(value: string): string {
    return new Date(value).toLocaleString('fr-FR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
