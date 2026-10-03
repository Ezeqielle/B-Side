import { DecimalPipe } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ArtistStat } from '../../core/models';
import { Podium, PodiumEntry } from './podium';

@Component({
  selector: 'app-top-artists',
  imports: [DecimalPipe, RouterLink, Podium],
  template: `
    @if (podium().length) {
      <app-podium class="mb-6 block" [entries]="podium()" round />
    }
    <ol class="space-y-3" start="4">
      @for (artist of artists().slice(3); track artist.name; let i = $index) {
        <li class="grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5">
          <span class="text-muted-foreground text-right text-sm tabular-nums">{{ i + 4 }}</span>
          <div class="min-w-0">
            <a
              class="inline-block max-w-full truncate align-top text-sm font-medium hover:underline"
              [routerLink]="[]"
              [queryParams]="{ artist: artist.name }"
              queryParamsHandling="merge"
              [title]="'Filtrer sur ' + artist.name"
              >{{ artist.name }}</a
            >
            <p class="text-muted-foreground text-xs">{{ artist.tracks | number }} titres</p>
          </div>
          <span class="text-sm tabular-nums">{{ artist.plays | number }}</span>
          <div class="bg-muted col-span-2 col-start-2 h-1 rounded-full" aria-hidden="true">
            <div
              class="bg-viz h-full rounded-full"
              [style.width.%]="(artist.plays / max()) * 100"
            ></div>
          </div>
        </li>
      }
    </ol>
    @if (!artists().length) {
      <p class="text-muted-foreground text-sm">Aucun artiste sur cette période.</p>
    }
  `,
})
export class TopArtists {
  readonly artists = input.required<ArtistStat[]>();

  protected readonly max = computed(() => this.artists()[0]?.plays ?? 1);

  protected readonly podium = computed(() =>
    this.artists()
      .slice(0, 3)
      .map(
        (artist): PodiumEntry => ({
          key: artist.name,
          name: artist.name,
          imageUrl: `/api/artwork/artist?name=${encodeURIComponent(artist.name)}`,
          plays: artist.plays,
        }),
      ),
  );
}
