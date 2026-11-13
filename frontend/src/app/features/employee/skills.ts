import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DatePipe, PercentPipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { DataService } from '../../core/data/data.service';
import { SKILL_SOURCE_LABELS, SkillEstimate } from '../../core/models';
import { KpiCard } from '../../shared/ui/kpi-card';
import { PageHeader } from '../../shared/ui/page-header';
import { SkillBar } from '../../shared/ui/skill-bar';

@Component({
  selector: 'wa-employee-skills',
  imports: [DatePipe, PercentPipe, MatButtonModule, KpiCard, PageHeader, SkillBar],
  templateUrl: './skills.html',
  styleUrl: './skills.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmployeeSkills {
  private readonly data = inject(DataService);

  readonly skills = this.data.skills;
  readonly history = this.data.skillHistory;
  readonly sourceLabels = SKILL_SOURCE_LABELS;
  readonly expanded = signal<string | null>('docker');

  readonly gaps = computed(() => this.skills().filter((skill) => skill.level < skill.target).length);
  readonly mastered = computed(() => this.skills().filter((skill) => skill.level >= skill.target).length);

  readonly averageConfidence = computed(() => {
    const list = this.skills();
    if (list.length === 0) {
      return 0;
    }
    return list.reduce((sum, skill) => sum + skill.confidence, 0) / list.length;
  });

  toggle(code: string): void {
    this.expanded.update((current) => (current === code ? null : code));
  }

  gapOf(skill: SkillEstimate): number {
    return skill.target - skill.level;
  }
}
