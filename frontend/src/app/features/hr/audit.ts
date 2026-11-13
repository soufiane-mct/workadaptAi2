import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { DataService } from '../../core/data/data.service';
import { PageHeader } from '../../shared/ui/page-header';

@Component({
  selector: 'wa-audit-log',
  imports: [DatePipe, PageHeader],
  template: `
    <div class="wa-page">
      <wa-page-header
        title="Journal d’audit"
        subtitle="Traçabilité des accès et des opérations sensibles : toute décision d’approbation, modification de référentiel et consultation RH y est enregistrée."
      >
        <span class="wa-chip wa-chip--neutral">{{ audit().length }} entrées</span>
      </wa-page-header>

      <div class="wa-card">
        <table class="wa-table">
          <thead>
            <tr>
              <th>Horodatage</th>
              <th>Acteur</th>
              <th>Action</th>
              <th>Cible</th>
              <th>Adresse IP</th>
            </tr>
          </thead>
          <tbody>
            @for (entry of audit(); track entry.id) {
              <tr>
                <td class="wa-mono">{{ entry.at | date: 'dd/MM/yyyy HH:mm:ss' }}</td>
                <td><strong>{{ entry.actor }}</strong></td>
                <td>{{ entry.action }}</td>
                <td class="wa-mono">{{ entry.target }}</td>
                <td class="wa-mono wa-muted">{{ entry.ip }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <div class="wa-card wa-section note">
        <span class="material-symbols-outlined">gavel</span>
        <div>
          <div class="note__title">Conservation et accès</div>
          <p>
            Le journal est en lecture seule pour les administrateurs. Il est conservé selon la
            politique de rétention définie et ne contient aucune donnée de contenu (pas de frappe
            clavier, pas de capture, pas de fichier).
          </p>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .note {
        display: flex;
        gap: 12px;
        align-items: flex-start;
        background: #f8f9fd;
      }
      .note .material-symbols-outlined {
        color: var(--wa-primary);
        font-size: 20px;
      }
      .note__title {
        font-size: 13px;
        font-weight: 600;
        margin-bottom: 4px;
      }
      .note p {
        margin: 0;
        font-size: 12.5px;
        color: var(--wa-ink-soft);
        line-height: 1.55;
        max-width: 900px;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuditLog {
  private readonly data = inject(DataService);
  readonly audit = this.data.audit;
}
