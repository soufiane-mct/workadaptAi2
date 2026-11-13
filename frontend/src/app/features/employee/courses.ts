import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { DataService } from '../../core/data/data.service';
import { COURSE_STATUS_LABELS, FORMAT_LABELS, ModuleFormat } from '../../core/models';
import { PageHeader } from '../../shared/ui/page-header';
import { StatusBadge } from '../../shared/ui/status-chip';

@Component({
  selector: 'wa-employee-courses',
  imports: [
    DatePipe,
    DecimalPipe,
    RouterLink,
    MatButtonModule,
    MatProgressBarModule,
    PageHeader,
    StatusBadge,
  ],
  templateUrl: './courses.html',
  styleUrl: './courses.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmployeeCourses {
  private readonly data = inject(DataService);

  readonly courses = this.data.courses;
  readonly activeCourse = this.data.activeCourse;
  readonly statusLabels = COURSE_STATUS_LABELS;
  readonly formatLabels = FORMAT_LABELS;

  /** Les six étapes du processus post-formation (CDC §5.X.3). */
  readonly pipeline = this.data.assessmentStages;

  readonly evaluationReady = computed(() => (this.activeCourse()?.progress ?? 0) >= 100);

  readonly formatIcons: Record<ModuleFormat, string> = {
    MULTIMEDIA: 'play_circle',
    INTERACTIVE: 'quiz',
    PRACTICAL: 'terminal',
    PROJECT: 'folder_special',
    SIMULATION: 'science',
    AI_TUTORED: 'smart_toy',
    COLLABORATIVE: 'groups',
  };

  advance(courseId: string, order: number, current: number): void {
    const course = this.courses().find((item) => item.id === courseId);
    if (!course || course.status !== 'IN_PROGRESS') {
      return;
    }
    const next = Math.min(100, current + 20);
    this.data.setModuleProgress(courseId, order, next);
  }

  statusLabel(status: string): string {
    switch (status) {
      case 'DONE':
        return 'Terminé';
      case 'IN_PROGRESS':
        return 'En cours';
      case 'AVAILABLE':
        return 'Disponible';
      default:
        return 'Verrouillé';
    }
  }

  statusTone(status: string): string {
    switch (status) {
      case 'DONE':
        return 'wa-chip wa-chip--success';
      case 'IN_PROGRESS':
        return 'wa-chip wa-chip--warning';
      case 'AVAILABLE':
        return 'wa-chip wa-chip--info';
      default:
        return 'wa-chip wa-chip--neutral';
    }
  }

  evaluationCta(courseId: string): string[] {
    return ['/app/parcours', courseId, 'evaluation'];
  }
}
