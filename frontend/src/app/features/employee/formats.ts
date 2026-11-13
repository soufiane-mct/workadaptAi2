import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { DataService } from '../../core/data/data.service';
import { ModuleFormat } from '../../core/models';
import { PageHeader } from '../../shared/ui/page-header';

@Component({
  selector: 'wa-employee-formats',
  imports: [RouterLink, MatButtonModule, PageHeader],
  templateUrl: './formats.html',
  styleUrl: './formats.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmployeeFormats {
  private readonly data = inject(DataService);

  readonly formats = this.data.formats;

  /** Formats réellement mobilisés par le parcours en cours. */
  readonly usedFormats = computed(
    () => new Set((this.data.activeCourse()?.modules ?? []).map((module) => module.format)),
  );

  isUsed(code: ModuleFormat): boolean {
    return this.usedFormats().has(code);
  }
}
