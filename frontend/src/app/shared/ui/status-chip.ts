import { Component, computed, input } from '@angular/core';

export type ChipTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

@Component({
  selector: 'wa-chip',
  template: `<span class="wa-chip" [class]="'wa-chip wa-chip--' + tone()">{{ label() }}</span>`,
})
export class StatusChip {
  readonly label = input.required<string>();
  readonly tone = input<ChipTone>('neutral');
}

/** Convertit un statut métier en libellé + couleur, de façon centralisée. */
export function toneForStatus(status: string): ChipTone {
  switch (status) {
    case 'APPROVED':
    case 'DONE':
    case 'COMPLETED':
    case 'CONNECTED':
    case 'ACTIVE':
    case 'RUNNING':
      return 'success';
    case 'PENDING':
    case 'PENDING_APPROVAL':
    case 'IN_PROGRESS':
    case 'WAITING_APPROVAL':
    case 'PARTIAL':
    case 'INVITED':
      return 'warning';
    case 'REJECTED':
    case 'FAILED':
    case 'ERROR':
    case 'DISABLED':
      return 'danger';
    case 'APPROVED_NOT_STARTED':
      return 'info';
    default:
      return 'neutral';
  }
}

@Component({
  selector: 'wa-status',
  template: `<span class="wa-chip" [class]="'wa-chip wa-chip--' + tone()">{{ text() }}</span>`,
})
export class StatusBadge {
  readonly status = input.required<string>();
  readonly labels = input<Record<string, string>>({});

  readonly text = computed(() => this.labels()[this.status()] ?? this.status());
  readonly tone = computed(() => toneForStatus(this.status()));
}
