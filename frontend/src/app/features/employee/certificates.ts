import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { DataService } from '../../core/data/data.service';
import { PageHeader } from '../../shared/ui/page-header';

@Component({
  selector: 'wa-employee-certificates',
  imports: [DatePipe, RouterLink, MatButtonModule, PageHeader],
  templateUrl: './certificates.html',
  styleUrl: './certificates.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmployeeCertificates {
  private readonly data = inject(DataService);
  readonly certificates = this.data.certificates;
}
