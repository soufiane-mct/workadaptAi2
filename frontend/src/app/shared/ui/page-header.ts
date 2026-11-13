import { Component, input } from '@angular/core';

@Component({
  selector: 'wa-page-header',
  template: `
    <header class="head">
      <div>
        <h1>{{ title() }}</h1>
        @if (subtitle()) {
          <p>{{ subtitle() }}</p>
        }
      </div>
      <div class="head__actions">
        <ng-content />
      </div>
    </header>
  `,
  styles: [
    `
      .head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 18px;
        margin-bottom: 22px;
        flex-wrap: wrap;
      }
      h1 {
        font-size: 25px;
        font-weight: 650;
        margin: 0 0 6px;
        letter-spacing: -0.02em;
      }
      p {
        margin: 0;
        color: var(--wa-ink-soft);
        font-size: 13.5px;
        max-width: 760px;
        line-height: 1.55;
      }
      .head__actions {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
      }
    `,
  ],
})
export class PageHeader {
  readonly title = input.required<string>();
  readonly subtitle = input<string>('');
}
