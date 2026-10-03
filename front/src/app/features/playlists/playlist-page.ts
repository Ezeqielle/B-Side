import { DatePipe, DecimalPipe, PercentPipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { Component, computed, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import { PlaylistStat, PlaylistTrackStat } from '../../core/models';
import { PlaylistCover } from './playlist-cover';
import { SincePipe } from './since';
import { Sort, SortHeader, sortRows } from './sort-header';

/** Au-delà, un titre est « souvent passé ». */
const OFTEN_SKIPPED = 0.5;

const FILTERS = [
  { value: 'all', label: 'Tous' },
  { value: 'never', label: 'Jamais écoutés' },
  { value: 'skipped', label: 'Souvent passés' },
] as const;

type Filter = (typeof FILTERS)[number]['value'];

const COLUMNS: Record<string, (track: PlaylistTrackStat) => string | number | null> = {
  position: (t) => t.position,
  name: (t) => t.name,
  plays: (t) => t.plays,
  skipRate: (t) => (t.plays ? t.skipRate : null),
  lastPlayedAt: (t) => t.lastPlayedAt && Date.parse(t.lastPlayedAt),
  addedAt: (t) => t.addedAt && Date.parse(t.addedAt),
};

/**
 * Titres d'une playlist avec leurs écoutes : de quoi repérer ceux à retirer.
 */
@Component({
  selector: 'app-playlist-page',
  imports: [
    DatePipe,
    DecimalPipe,
    PercentPipe,
    RouterLink,
    HlmButtonImports,
    HlmCardImports,
    HlmSkeletonImports,
    PlaylistCover,
    SincePipe,
    SortHeader,
  ],
  template: `
    <a routerLink="/playlists" class="text-muted-foreground hover:text-foreground mb-4 inline-block text-sm">
      ← Toutes les playlists
    </a>

    @if (playlist(); as p) {
      <div class="mb-6 flex items-center gap-4">
        <app-playlist-cover class="size-20 sm:size-24" [playlist]="p" />
        <div class="min-w-0">
          <h1 class="truncate text-2xl font-bold tracking-tight">{{ p.name }}</h1>
          <p class="text-muted-foreground text-sm">
            {{ p.tracks | number }} titres · {{ p.artists | number }} artistes · {{ duration() }}
          </p>
          <p class="text-muted-foreground text-sm">
            Dernière écoute {{ p.lastPlayedAt | since: 'jamais' }} · dernier ajout {{ p.lastAddedAt | since }}
          </p>
        </div>
      </div>
    }

    @if (tracks.error()) {
      <p class="text-destructive" role="alert">Impossible de récupérer cette playlist.</p>
    } @else if (tracks.hasValue()) {
      <section hlmCard>
        <div hlmCardHeader class="flex flex-wrap items-center justify-between gap-2">
          <h2 hlmCardTitle>Titres</h2>
          <div class="flex gap-1" role="group" aria-label="Afficher">
            @for (option of filters; track option.value) {
              <button
                hlmBtn
                size="xs"
                [variant]="filter() === option.value ? 'secondary' : 'ghost'"
                [attr.aria-pressed]="filter() === option.value"
                (click)="filter.set(option.value)"
              >
                {{ option.label }} ({{ counts()[option.value] }})
              </button>
            }
          </div>
        </div>
        <div hlmCardContent>
          <div class="-mx-6 overflow-x-auto px-6">
            <table class="w-full text-sm">
              <thead class="text-muted-foreground border-b text-left text-xs">
                <tr>
                  <th class="w-10 pb-2 text-right" appSortHeader="position" [desc]="false" [(sort)]="sort">#</th>
                  <th class="pb-2 pl-3" appSortHeader="name" [desc]="false" [(sort)]="sort">Titre</th>
                  <th class="pb-2 text-right" appSortHeader="plays" [(sort)]="sort">Écoutes</th>
                  <th class="hidden pb-2 text-right sm:table-cell" appSortHeader="skipRate" [(sort)]="sort">Passés</th>
                  <th class="pb-2 text-right" appSortHeader="lastPlayedAt" [desc]="false" [(sort)]="sort">
                    Dernière écoute
                  </th>
                  <th class="hidden pb-2 text-right md:table-cell" appSortHeader="addedAt" [desc]="false" [(sort)]="sort">
                    Ajouté le
                  </th>
                </tr>
              </thead>
              <tbody>
                @for (track of rows(); track track.position) {
                  <tr class="border-b last:border-0">
                    <td class="text-muted-foreground py-2 text-right tabular-nums">{{ track.position + 1 }}</td>
                    <td class="max-w-0 py-2 pr-4 pl-3">
                      <p class="truncate font-medium" [title]="track.name">{{ track.name }}</p>
                      <p class="text-muted-foreground truncate text-xs">{{ track.artistName }}</p>
                    </td>
                    <td class="py-2 text-right tabular-nums" [class.text-muted-foreground]="!track.plays">
                      {{ track.plays | number }}
                    </td>
                    <td class="hidden py-2 text-right tabular-nums sm:table-cell">
                      {{ track.plays ? (track.skipRate | percent) : '—' }}
                    </td>
                    <td class="py-2 text-right whitespace-nowrap">{{ track.lastPlayedAt | since: 'jamais' }}</td>
                    <td class="text-muted-foreground hidden py-2 text-right whitespace-nowrap md:table-cell">
                      {{ track.addedAt ? (track.addedAt | date: 'd MMM yyyy') : '—' }}
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="6" class="text-muted-foreground py-4 text-center">Aucun titre.</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      </section>
    } @else {
      <div hlmSkeleton class="h-96 rounded-xl"></div>
    }
  `,
})
export class PlaylistPage {
  /** Id Spotify, depuis l'URL. */
  readonly id = input.required<string>();

  protected readonly filters = FILTERS;
  protected readonly filter = signal<Filter>('all');
  protected readonly sort = signal<Sort>({ key: 'position', desc: false });

  private readonly playlists = httpResource<PlaylistStat[]>(() => '/api/playlists');
  protected readonly tracks = httpResource<PlaylistTrackStat[]>(
    () => `/api/playlists/${encodeURIComponent(this.id())}/tracks`,
  );

  protected readonly playlist = computed(() =>
    this.playlists.hasValue() ? this.playlists.value().find((p) => p.id === this.id()) : undefined,
  );

  protected readonly duration = computed(() => {
    const minutes = Math.round((this.playlist()?.durationMs ?? 0) / 60_000);
    return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
  });

  private readonly matching: Record<Filter, (track: PlaylistTrackStat) => boolean> = {
    all: () => true,
    never: (t) => !t.plays,
    skipped: (t) => t.plays > 0 && t.skipRate >= OFTEN_SKIPPED,
  };

  protected readonly counts = computed(() => {
    const tracks = this.tracks.hasValue() ? this.tracks.value() : [];
    return Object.fromEntries(
      FILTERS.map(({ value }) => [value, tracks.filter(this.matching[value]).length]),
    ) as Record<Filter, number>;
  });

  protected readonly rows = computed(() => {
    const { key, desc } = this.sort();
    const tracks = this.tracks.hasValue() ? this.tracks.value() : [];
    return sortRows(tracks.filter(this.matching[this.filter()]), COLUMNS[key], desc);
  });
}
