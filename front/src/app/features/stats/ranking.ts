import { DecimalPipe } from '@angular/common';
import { Component, booleanAttribute, computed, inject, input } from '@angular/core';
import { RouterLink, UrlTree } from '@angular/router';
import { TrackPreview } from '../../core/track-preview';
import { Podium } from './podium';
import { StatsFilter } from './stats-filter';

/** Un titre (avec `trackId`) ou un artiste d'un classement. */
export interface RankingEntry {
  key: string;
  name: string;
  /** Artiste du titre, ou l'artiste lui-même : lien vers ses stats. */
  artist: string;
  /** Ligne sous le nom d'un artiste : « 12 titres ». */
  detail?: string;
  imageUrl: string;
  /** Id Spotify d'un titre, pour son extrait au survol. */
  trackId?: string;
  plays: number;
}

export interface RankedEntry extends RankingEntry {
  /** Stats filtrées sur l'artiste. */
  link: UrlTree;
}

/**
 * Classement de titres ou d'artistes : les trois premiers sur un podium, puis une barre par entrée.
 */
@Component({
  selector: 'app-ranking',
  imports: [DecimalPipe, RouterLink, Podium, TrackPreview],
  template: `
    @if (ranked().length) {
      <app-podium class="mb-6 block" [entries]="ranked()" [round]="round()" />
    }
    <ol class="space-y-3" start="4">
      @for (entry of ranked().slice(3); track entry.key; let i = $index) {
        <li
          class="grid items-center gap-x-3 gap-y-1.5"
          [class]="
            entry.trackId
              ? 'grid-cols-[1.5rem_auto_minmax(0,1fr)_auto]'
              : 'grid-cols-[1.5rem_minmax(0,1fr)_auto]'
          "
        >
          <span class="text-muted-foreground text-right text-sm tabular-nums">{{ i + 4 }}</span>
          @if (entry.trackId; as trackId) {
            <app-track-preview
              class="size-9 rounded-md"
              [trackId]="trackId"
              [name]="entry.name"
              [imageUrl]="entry.imageUrl"
            />
            <div class="min-w-0">
              <p class="truncate text-sm font-medium" [title]="entry.name">{{ entry.name }}</p>
              <a
                class="text-muted-foreground hover:text-foreground inline-block max-w-full truncate align-top text-xs hover:underline"
                [routerLink]="entry.link"
                [title]="'Filtrer sur ' + entry.artist"
                >{{ entry.artist }}</a
              >
            </div>
          } @else {
            <div class="min-w-0">
              <a
                class="inline-block max-w-full truncate align-top text-sm font-medium hover:underline"
                [routerLink]="entry.link"
                [title]="'Filtrer sur ' + entry.name"
                >{{ entry.name }}</a
              >
              @if (entry.detail) {
                <p class="text-muted-foreground text-xs">{{ entry.detail }}</p>
              }
            </div>
          }
          <span class="text-sm tabular-nums">{{ entry.plays | number }}</span>
          <div
            class="bg-muted col-span-2 h-1 rounded-full"
            [class]="entry.trackId ? 'col-start-3' : 'col-start-2'"
            aria-hidden="true"
          >
            <div
              class="bg-viz h-full rounded-full"
              [style.width.%]="(entry.plays / max()) * 100"
            ></div>
          </div>
        </li>
      }
    </ol>
    @if (!entries().length) {
      <p class="text-muted-foreground text-sm">{{ empty() }}</p>
    }
  `,
})
export class Ranking {
  readonly entries = input.required<RankingEntry[]>();
  /** Images rondes, pour les artistes. */
  readonly round = input(false, { transform: booleanAttribute });
  /** Texte affiché sans aucune entrée. */
  readonly empty = input.required<string>();

  private readonly filter = inject(StatsFilter);

  protected readonly ranked = computed(() =>
    this.entries().map((entry): RankedEntry => ({
      ...entry,
      link: this.filter.link({ artist: entry.artist }),
    })),
  );

  protected readonly max = computed(() => this.entries()[0]?.plays ?? 1);
}
