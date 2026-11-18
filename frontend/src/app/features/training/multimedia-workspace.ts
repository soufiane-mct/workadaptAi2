import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { MultimediaProgram } from '../../core/models';
import { WorkspaceBase } from './workspace-base';

@Component({
  selector: 'wa-multimedia-workspace',
  template: `
    <div class="ws-body">
      <aside class="ws-panel">
        <h2>Série documentaire</h2>
        <p class="ws-panel__sub">{{ units().length }} épisodes · vidéo, article et podcast</p>
        <div class="ws-list">
          @for (unit of units(); track unit.id; let index = $index) {
            <button
              type="button"
              class="ws-unit"
              [class.ws-unit--active]="activeUnit()?.id === unit.id"
              [class.ws-unit--done]="isDone(unit.id)"
              [class.ws-unit--locked]="isLocked(unit.id)"
              (click)="selectUnit(unit.id)"
            >
              <span class="ws-unit__index">
                {{ isDone(unit.id) ? '✓' : index + 1 }}
              </span>
              <span class="ws-unit__title">
                {{ unit.title }}
                <span class="ws-unit__kind">{{ unit.minutes }} min</span>
              </span>
              <span class="material-symbols-outlined">play_circle</span>
            </button>
          }
        </div>
      </aside>

      @if (episode(); as ep) {
        <main class="ws-main">
          <section class="player">
            <div class="player__screen">
              <span class="material-symbols-outlined">play_arrow</span>
              <div>
                <strong>{{ ep.video.title }}</strong>
                <small>{{ ep.video.durationMinutes }} min · {{ ep.video.chapters.length }} chapitres</small>
              </div>
            </div>
            <div class="player__tabs">
              @for (tab of tabs; track tab.key) {
                <button
                  type="button"
                  [class.on]="mode() === tab.key"
                  (click)="mode.set(tab.key)"
                >
                  {{ tab.label }}
                </button>
              }
            </div>
          </section>

          <section class="ws-panel">
            <span class="ws-tag">Objectif de l’épisode</span>
            <p class="wa-small" style="margin: 8px 0 0">{{ ep.objective }}</p>
          </section>

          @switch (mode()) {
            @case ('video') {
              <section class="ws-panel">
                <h2>Chapitres de la vidéo</h2>
                <ol class="chapters">
                  @for (chapter of ep.video.chapters; track chapter; let index = $index) {
                    <li>
                      <span class="stamp">{{ index + 1 }}</span>
                      {{ chapter }}
                    </li>
                  }
                </ol>
              </section>
            }
            @case ('article') {
              <section class="ws-panel article">
                <h2>{{ ep.article.title }}</h2>
                @for (section of ep.article.sections; track section; let index = $index) {
                  <div class="paragraph">
                    <span class="paragraph__num">{{ index + 1 }}</span>
                    <p>{{ section }}</p>
                  </div>
                }
              </section>
            }
            @case ('podcast') {
              <section class="ws-panel podcast">
                <div class="audio">
                  <span class="material-symbols-outlined">headphones</span>
                  <div class="audio__wave">
                    @for (bar of bars; track $index) {
                      <span [style.height.%]="bar"></span>
                    }
                  </div>
                  <strong>{{ ep.podcast.durationMinutes }} min</strong>
                </div>
                <h2>{{ ep.podcast.title }}</h2>
                <p class="wa-small wa-muted">{{ ep.podcast.summary }}</p>
              </section>
            }
          }

          <section class="ws-panel">
            <h2>Points clés à retenir</h2>
            <ul class="keypoints">
              @for (point of ep.keyPoints; track point) {
                <li>{{ point }}</li>
              }
            </ul>
          </section>

          <section class="ws-panel">
            <h2>Notes guidées</h2>
            <p class="ws-panel__sub">{{ ep.notesPrompt }}</p>
            <textarea
              class="wa-textarea"
              rows="4"
              [value]="notes()"
              (input)="notes.set($any($event.target).value)"
              (blur)="saveNotes()"
              [disabled]="!editable()"
            ></textarea>

            <h2 style="margin-top: 16px">Restitution orale</h2>
            <p class="ws-panel__sub">{{ ep.restitutionQuestion }}</p>
            <label class="ws-check">
              <input
                type="checkbox"
                [checked]="restitutionDone()"
                (change)="restitutionDone.set($any($event.target).checked)"
                [disabled]="!editable()"
              />
              <span>J’ai restitué cet épisode à voix haute sans support.</span>
            </label>

            <div class="ws-actions">
              <button
                class="btn btn--primary"
                type="button"
                [disabled]="!editable() || isDone(ep.id) || !restitutionDone()"
                (click)="finish(ep.id)"
              >
                <span class="material-symbols-outlined">check_circle</span>
                {{ isDone(ep.id) ? 'Épisode terminé' : 'Marquer l’épisode terminé' }}
              </button>
              <span class="wa-small wa-muted">
                Le dossier de synthèse final est demandé après tous les épisodes.
              </span>
            </div>
          </section>
        </main>
      }
    </div>
  `,
  styleUrl: './workspace.scss',
  styles: [
    `
      .player {
        border-radius: var(--wa-radius);
        overflow: hidden;
        border: 1px solid var(--wa-border);
        background: #0f1424;
        color: #fff;
      }
      .player__screen {
        display: flex;
        align-items: center;
        gap: 14px;
        padding: 24px;
        background:
          radial-gradient(circle at 80% 20%, rgba(124, 58, 237, 0.35), transparent 55%),
          linear-gradient(135deg, #1a2240, #2b1f4d);
      }
      .player__screen .material-symbols-outlined {
        display: grid;
        place-items: center;
        width: 54px;
        height: 54px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.16);
        font-size: 30px;
      }
      .player__screen strong {
        display: block;
        font-size: 16px;
      }
      .player__screen small {
        font-size: 11.5px;
        color: rgba(255, 255, 255, 0.7);
      }
      .player__tabs {
        display: flex;
        gap: 4px;
        padding: 8px;
        background: #141a2e;
      }
      .player__tabs button {
        border: none;
        background: transparent;
        color: rgba(255, 255, 255, 0.64);
        padding: 8px 13px;
        border-radius: 8px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
      }
      .player__tabs button.on {
        background: rgba(255, 255, 255, 0.14);
        color: #fff;
      }
      .chapters {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .chapters li {
        display: flex;
        gap: 10px;
        align-items: flex-start;
        font-size: 13px;
      }
      .stamp {
        width: 24px;
        height: 24px;
        flex: none;
        border-radius: 7px;
        background: var(--wa-primary-soft);
        color: var(--wa-primary-deep);
        display: grid;
        place-items: center;
        font-size: 11px;
        font-weight: 700;
      }
      .paragraph {
        display: flex;
        gap: 10px;
        padding: 8px 0;
        border-bottom: 1px dashed var(--wa-border);
      }
      .paragraph:last-child {
        border-bottom: none;
      }
      .paragraph__num {
        color: var(--wa-violet);
        font-weight: 700;
        font-size: 12px;
      }
      .paragraph p {
        margin: 0;
        font-size: 13px;
        line-height: 1.6;
      }
      .audio {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 14px;
        border-radius: 12px;
        background: #0f1424;
        color: #fff;
        margin-bottom: 12px;
      }
      .audio__wave {
        flex: 1;
        display: flex;
        align-items: center;
        gap: 3px;
        height: 34px;
      }
      .audio__wave span {
        flex: 1;
        border-radius: 2px;
        background: linear-gradient(180deg, #8b7bff, #4f6bff);
      }
      .keypoints {
        margin: 0;
        padding-left: 18px;
        font-size: 13px;
        line-height: 1.7;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MultimediaWorkspace extends WorkspaceBase {
  readonly tabs = [
    { key: 'video' as const, label: 'Vidéo' },
    { key: 'article' as const, label: 'Article' },
    { key: 'podcast' as const, label: 'Podcast' },
  ];
  readonly bars = [40, 65, 30, 80, 55, 90, 45, 70, 35, 85, 50, 75, 60, 95, 42, 68];

  readonly mode = signal<'video' | 'article' | 'podcast'>('video');
  readonly notes = signal('');
  readonly restitutionDone = signal(false);

  readonly mm = computed(() => this.program() as MultimediaProgram);
  readonly episode = computed(() =>
    this.mm().episodes.find((item) => item.id === this.activeUnit()?.id),
  );

  selectUnit(unitId: string): void {
    this.select(unitId);
    this.restitutionDone.set(false);
    this.notes.set('');
    this.mode.set('video');
  }

  saveNotes(): void {
    const episode = this.episode();
    if (episode && this.notes().trim()) {
      this.data.saveTrainingNotes(this.request().id, episode.id, this.notes());
    }
  }

  finish(unitId: string): void {
    this.saveNotes();
    this.complete(unitId, this.episode()?.estimatedMinutes);
    this.restitutionDone.set(false);
    this.notes.set('');
  }
}
