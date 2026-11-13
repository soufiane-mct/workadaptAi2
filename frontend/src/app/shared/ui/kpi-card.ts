import { Component, input } from '@angular/core';

export type KpiTone = 'blue' | 'violet' | 'green' | 'amber';

@Component({
  selector: 'wa-kpi-card',
  template: `
    <div class="kpi" [class]="'kpi kpi--' + tone()">
      <div class="kpi__head">
        <span class="kpi__icon material-symbols-outlined">{{ icon() }}</span>
        @if (trend()) {
          <span class="kpi__trend" [class.kpi__trend--down]="trendDown()">{{ trend() }}</span>
        }
      </div>
      <div class="kpi__value">{{ value() }}<span class="kpi__unit">{{ unit() }}</span></div>
      <div class="kpi__label">{{ label() }}</div>
      @if (hint()) {
        <div class="kpi__hint">{{ hint() }}</div>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        height: 100%;
      }
      .kpi {
        --kpi-tint: #eef2ff;
        --kpi-ink: #2f54eb;
        position: relative;
        overflow: hidden;
        background: var(--wa-surface);
        border: 1px solid var(--wa-border);
        border-radius: var(--wa-radius);
        box-shadow: var(--wa-shadow);
        padding: 17px 18px;
        display: flex;
        flex-direction: column;
        gap: 4px;
        height: 100%;
        transition:
          transform 0.16s ease,
          box-shadow 0.16s ease,
          border-color 0.16s ease;

        &::after {
          content: '';
          position: absolute;
          inset: 0 0 auto auto;
          width: 120px;
          height: 120px;
          border-radius: 50%;
          background: radial-gradient(circle, var(--kpi-tint), transparent 70%);
          transform: translate(38%, -48%);
          pointer-events: none;
        }

        &:hover {
          transform: translateY(-2px);
          border-color: var(--wa-border-strong);
          box-shadow: var(--wa-shadow-lg);
        }
      }
      .kpi--violet {
        --kpi-tint: #f4ecff;
        --kpi-ink: #7c3aed;
      }
      .kpi--green {
        --kpi-tint: #e7f7ef;
        --kpi-ink: #0f9d58;
      }
      .kpi--amber {
        --kpi-tint: #fdf3e2;
        --kpi-ink: #b26a00;
      }
      .kpi__head {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .kpi__icon {
        display: inline-flex;
        width: 38px;
        height: 38px;
        align-items: center;
        justify-content: center;
        border-radius: 11px;
        background: var(--kpi-tint);
        color: var(--kpi-ink);
        font-size: 20px;
      }
      .kpi__trend {
        font-size: 12px;
        font-weight: 600;
        color: var(--wa-success);
      }
      .kpi__trend--down {
        color: var(--wa-warning);
      }
      .kpi__value {
        font-size: 30px;
        font-weight: 650;
        line-height: 1.1;
        margin-top: 8px;
        letter-spacing: -0.02em;
      }
      .kpi__unit {
        font-size: 14px;
        font-weight: 500;
        color: var(--wa-ink-soft);
        margin-left: 3px;
        letter-spacing: 0;
      }
      .kpi__label {
        font-size: 13px;
        font-weight: 600;
      }
      .kpi__hint {
        font-size: 11.5px;
        color: var(--wa-ink-soft);
        line-height: 1.4;
        margin-top: 2px;
      }
    `,
  ],
})
export class KpiCard {
  readonly label = input.required<string>();
  readonly value = input.required<string | number>();
  readonly unit = input<string>('');
  readonly hint = input<string>('');
  readonly icon = input<string>('insights');
  readonly tone = input<KpiTone>('blue');
  readonly trend = input<string>('');
  readonly trendDown = input<boolean>(false);
}
