import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../../core/auth/auth.service';
import { DataService } from '../../core/data/data.service';
import { ROLE_LABELS } from '../../core/models';
import { PageHeader } from '../../shared/ui/page-header';

@Component({
  selector: 'wa-employee-profile',
  imports: [DatePipe, RouterLink, MatButtonModule, PageHeader],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmployeeProfile {
  private readonly auth = inject(AuthService);
  private readonly data = inject(DataService);

  readonly user = this.auth.user;
  readonly roleLabels = ROLE_LABELS;
  readonly sources = this.data.sources;
  readonly cvName = signal<string | null>('CV_Soufiane_Mechta_2026.pdf');
  readonly cvImportedAt = signal<string>('2026-11-04');

  onCvSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.cvName.set(file.name);
      this.cvImportedAt.set(new Date().toISOString().slice(0, 10));
    }
  }

  sourceTone(status: string): string {
    switch (status) {
      case 'CONNECTED':
        return 'wa-chip wa-chip--success';
      case 'PARTIAL':
        return 'wa-chip wa-chip--warning';
      default:
        return 'wa-chip wa-chip--neutral';
    }
  }

  sourceLabel(status: string): string {
    switch (status) {
      case 'CONNECTED':
        return 'Connectée';
      case 'PARTIAL':
        return 'Partielle';
      default:
        return 'Non connectée';
    }
  }
}
