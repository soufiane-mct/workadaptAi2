import { Component, input } from '@angular/core';

export type ChipTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

@Component({
  selector: 'wa-chip',
  template: `<span class="wa-chip" [class]="'wa-chip wa-chip--' + tone()">{{ label() }}</span>`,
})
export class StatusChip {
  readonly label = input.required<string>();
  readonly tone = input<ChipTone>('neutral');
}
