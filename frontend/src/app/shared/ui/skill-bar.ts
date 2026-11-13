import { Component, computed, input } from '@angular/core';

/** Barre de niveau avec repère de la cible attendue pour le poste. */
@Component({
  selector: 'wa-skill-bar',
  template: `
    <div class="bar">
      <div class="bar__track">
        <div
          class="bar__fill"
          [style.width.%]="level()"
          [style.background]="color()"
        ></div>
        <div class="bar__target" [style.left.%]="target()" [title]="'Cible : ' + target()"></div>
      </div>
      <div class="bar__legend">
        <span class="bar__value">{{ level() }}</span>
        <span class="bar__target-label">cible {{ target() }}</span>
      </div>
    </div>
  `,
  styles: [
    `
      .bar {
        min-width: 160px;
      }
      .bar__track {
        position: relative;
        height: 9px;
        border-radius: 999px;
        background: #eceff6;
        box-shadow: inset 0 1px 1px rgba(20, 27, 45, 0.05);
        overflow: visible;
      }
      .bar__fill {
        position: absolute;
        inset: 0 auto 0 0;
        border-radius: 999px;
        transition: width 0.4s ease;
      }
      .bar__target {
        position: absolute;
        top: -3px;
        bottom: -3px;
        width: 2px;
        border-radius: 2px;
        background: #1b2333;
        opacity: 0.55;
      }
      .bar__legend {
        display: flex;
        justify-content: space-between;
        margin-top: 5px;
        font-size: 11.5px;
      }
      .bar__value {
        font-weight: 600;
      }
      .bar__target-label {
        color: var(--wa-ink-soft);
      }
    `,
  ],
})
export class SkillBar {
  readonly level = input.required<number>();
  readonly target = input.required<number>();

  readonly color = computed(() => {
    const value = this.level();
    const goal = this.target();
    if (value >= goal) {
      return 'var(--wa-success)';
    }
    if (goal - value >= 25) {
      return 'var(--wa-danger)';
    }
    return 'var(--wa-warning)';
  });
}
