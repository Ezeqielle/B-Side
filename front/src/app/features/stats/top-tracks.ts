import { DecimalPipe } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TrackStat } from '../../core/models';
import { Podium, PodiumEntry } from './podium';

@Component({
  selector: 'app-top-tracks',
  imports: [DecimalPipe, RouterLink, Podium],
  template: `
    @if (podium().length) {
      <app-podium class="mb-6 block" [entries]="podium()" />
    }
    <ol class="space-y-3" start="4">
      @for (track of tracks().slice(3); track track.id; let i = $index) {
        <li class="grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5">
          <span class="text-muted-foreground text-right text-sm tabular-nums">{{ i + 4 }}</span>
          <div class="min-w-0">
            <p class="truncate text-sm font-medium" [title]="track.name">{{ track.name }}</p>
            <a
              class="text-muted-foreground hover:text-foreground inline-block max-w-full truncate align-top text-xs hover:underline"
              [routerLink]="[]"
              [queryParams]="{ artist: track.artistName }"
              queryParamsHandling="merge"
              [title]="'Filtrer sur ' + track.artistName"
              >{{ track.artistName }}</a
            >
          </div>
          <span class="text-sm tabular-nums">{{ track.plays | number }}</span>
          <div class="bg-muted col-span-2 col-start-2 h-1 rounded-full" aria-hidden="true">
            <div
              class="bg-viz h-full rounded-full"
              [style.width.%]="(track.plays / max()) * 100"
            ></div>
          </div>
        </li>
      }
    </ol>
    @if (!tracks().length) {
      <p class="text-muted-foreground text-sm">
        Aucun titre écouté plus de 30 secondes sur cette période.
      </p>
    }
  `,
})
export class TopTracks {
  readonly tracks = input.required<TrackStat[]>();

  protected readonly max = computed(() => this.tracks()[0]?.plays ?? 1);

  protected readonly podium = computed(() =>
    this.tracks()
      .slice(0, 3)
      .map(
        (track): PodiumEntry => ({
          key: track.id,
          name: track.name,
          artist: track.artistName,
          imageUrl: `/api/artwork/track/${track.id}`,
          plays: track.plays,
        }),
      ),
  );
}
