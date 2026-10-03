import { DecimalPipe, PercentPipe } from '@angular/common';
import { Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { PlaylistStat } from '../../core/models';
import { PlaylistCover } from './playlist-cover';
import { SincePipe } from './since';
import { Sort, SortHeader, sortRows } from './sort-header';

const COLUMNS: Record<string, (playlist: PlaylistStat) => string | number | null> = {
  name: (p) => p.name,
  tracks: (p) => p.tracks,
  neverPlayed: (p) => (p.tracks ? p.neverPlayed / p.tracks : null),
  skipRate: (p) => (p.tracks ? p.skipRate : null),
  lastPlayedAt: (p) => p.lastPlayedAt && Date.parse(p.lastPlayedAt),
  lastAddedAt: (p) => p.lastAddedAt && Date.parse(p.lastAddedAt),
};

@Component({
  selector: 'app-playlist-table',
  imports: [DecimalPipe, PercentPipe, RouterLink, PlaylistCover, SincePipe, SortHeader],
  template: `
    <div class="-mx-6 overflow-x-auto px-6">
      <table class="w-full text-sm">
        <thead class="text-muted-foreground border-b text-left text-xs">
          <tr>
            <th class="pb-2" appSortHeader="name" [desc]="false" [(sort)]="sort">Playlist</th>
            <th class="pb-2 text-right" appSortHeader="tracks" [(sort)]="sort">Titres</th>
            <th class="pb-2 text-right" appSortHeader="neverPlayed" [(sort)]="sort">Jamais écoutés</th>
            <th class="hidden pb-2 text-right sm:table-cell" appSortHeader="skipRate" [(sort)]="sort">Passés</th>
            <th class="pb-2 text-right" appSortHeader="lastPlayedAt" [desc]="false" [(sort)]="sort">
              Dernière écoute
            </th>
            <th class="hidden pb-2 text-right md:table-cell" appSortHeader="lastAddedAt" [desc]="false" [(sort)]="sort">
              Dernier ajout
            </th>
          </tr>
        </thead>
        <tbody>
          @for (playlist of rows(); track playlist.id) {
            <tr class="hover:bg-muted/50 border-b last:border-0">
              <td class="py-2 pr-4">
                <a [routerLink]="playlist.id" class="flex min-w-0 items-center gap-3">
                  <app-playlist-cover class="size-10" [name]="playlist.name" [imageUrl]="playlist.imageUrl" />
                  <span class="min-w-0">
                    <span class="block max-w-64 truncate font-medium hover:underline">{{ playlist.name }}</span>
                    @if (playlist.ownerName !== me()) {
                      <span class="text-muted-foreground block truncate text-xs">par {{ playlist.ownerName }}</span>
                    }
                  </span>
                </a>
              </td>
              <td class="py-2 text-right tabular-nums">{{ playlist.tracks | number }}</td>
              <td class="py-2 text-right tabular-nums">
                @if (playlist.neverPlayed) {
                  {{ playlist.neverPlayed | number }}
                  <span class="text-muted-foreground">({{ playlist.neverPlayed / playlist.tracks | percent }})</span>
                } @else {
                  <span class="text-muted-foreground">0</span>
                }
              </td>
              <td class="hidden py-2 text-right tabular-nums sm:table-cell">
                {{ playlist.tracks ? (playlist.skipRate | percent) : '—' }}
              </td>
              <td class="py-2 text-right whitespace-nowrap">{{ playlist.lastPlayedAt | since: 'jamais' }}</td>
              <td class="text-muted-foreground hidden py-2 text-right whitespace-nowrap md:table-cell">
                {{ playlist.lastAddedAt | since }}
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class PlaylistTable {
  readonly playlists = input.required<PlaylistStat[]>();

  private readonly auth = inject(AuthService);

  /** Le nom du propriétaire n'est affiché que pour les playlists des autres. */
  protected readonly me = computed(() => this.auth.user()?.displayName);
  protected readonly sort = signal<Sort>({ key: 'name', desc: false });

  protected readonly rows = computed(() => {
    const { key, desc } = this.sort();
    return sortRows(this.playlists(), COLUMNS[key], desc);
  });
}
