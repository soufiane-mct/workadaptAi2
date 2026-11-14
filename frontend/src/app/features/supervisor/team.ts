import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { DataService } from '../../core/data/data.service';
import { SKILL_SOURCE_LABELS, TeamMember } from '../../core/models';
import { PageHeader } from '../../shared/ui/page-header';

/**
 * Mon équipe (CDC §11.3) : consultation en lecture seule des profils de
 * compétences autorisés. Le superviseur ne modifie jamais un profil.
 */
@Component({
  selector: 'wa-supervisor-team',
  imports: [DatePipe, PageHeader],
  templateUrl: './team.html',
  styleUrl: './team.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SupervisorTeam {
  private readonly data = inject(DataService);

  readonly search = signal('');
  readonly department = signal('ALL');
  readonly selectedId = signal<string | null>(null);

  readonly team = computed(() => this.data.team().filter((member) => member.status === 'ACTIVE'));

  readonly departments = computed(() => [
    'ALL',
    ...Array.from(new Set(this.team().map((member) => member.department))).sort(),
  ]);

  readonly filtered = computed(() => {
    const query = this.search().trim().toLowerCase();
    const department = this.department();
    return this.team().filter((member) => {
      const matchDepartment = department === 'ALL' || member.department === department;
      const matchQuery =
        !query ||
        member.name.toLowerCase().includes(query) ||
        member.jobTitle.toLowerCase().includes(query);
      return matchDepartment && matchQuery;
    });
  });

  readonly selected = computed<TeamMember | null>(() => {
    const id = this.selectedId();
    if (id) {
      return this.team().find((member) => member.id === id) ?? null;
    }
    return this.filtered()[0] ?? null;
  });

  readonly gaps = computed(() => {
    const member = this.selected();
    return (member?.skills ?? [])
      .map((skill) => ({ ...skill, gap: Math.max(0, skill.target - skill.level) }))
      .sort((a, b) => b.gap - a.gap);
  });

  readonly criticalGapCount = computed(
    () => this.team().flatMap((member) => member.skills ?? []).filter((skill) => skill.target - skill.level >= 25).length,
  );

  readonly lowConfidenceCount = computed(
    () =>
      this.team()
        .flatMap((member) => member.skills ?? [])
        .filter((skill) => skill.confidence < 0.5).length,
  );

  readonly sourceLabels = SKILL_SOURCE_LABELS;

  select(member: TeamMember): void {
    this.selectedId.set(member.id);
  }

  gapTone(gap: number): string {
    if (gap >= 30) {
      return 'wa-chip wa-chip--danger';
    }
    if (gap >= 15) {
      return 'wa-chip wa-chip--warning';
    }
    return 'wa-chip wa-chip--success';
  }

  confidenceTone(confidence: number): string {
    if (confidence >= 0.7) {
      return 'wa-chip wa-chip--success';
    }
    if (confidence >= 0.5) {
      return 'wa-chip wa-chip--warning';
    }
    return 'wa-chip wa-chip--danger';
  }

  confidenceLabel(confidence: number): string {
    if (confidence >= 0.7) {
      return 'Confiance élevée';
    }
    if (confidence >= 0.5) {
      return 'Confiance moyenne';
    }
    return 'Confiance faible';
  }
}
