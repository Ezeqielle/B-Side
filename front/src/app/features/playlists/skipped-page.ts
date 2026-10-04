import { DecimalPipe, Location, PercentPipe } from '@angular/common';
import { Component, computed, effect, inject, input, linkedSignal, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCheckboxImports } from '@spartan-ng/helm/checkbox';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import { HistoryApi } from '../../core/history-api';
import { SkipFilter, SkippedSong } from '../../core/models';
import { paged } from '../../core/paged';
import { PlaylistsApi } from '../../core/playlists-api';
import { TrackPreview, trackArtwork } from '../../core/track-preview';
import { RemovalTarget, removal } from './removal';
import { RemovalOutcome, RemoveTracks } from './remove-tracks';
import { SincePipe } from './since';
import { SkipFilterPanel } from './skip-filter-panel';
import { skipFilterOf, skipParamsOf } from './skip-filter';

const LIMIT = 30;

/** À partir de ce nombre de passages, un morceau ressort. */
const OFTEN = 3;

/**
 * Derniers morceaux passés parmi ceux des playlists et des likes, avec leur nombre total de passages.
 * Un morceau coché est retiré de toutes les playlists qui le contiennent, toutes versions et likes compris.
 */
@Component({
  selector: 'app-skipped-page',
  imports: [
    DecimalPipe,
    PercentPipe,
    RouterLink,
    HlmBadgeImports,
    HlmButtonImports,
    HlmCheckboxImports,
    HlmSkeletonImports,
    RemovalOutcome,
    RemoveTracks,
    SincePipe,
    SkipFilterPanel,
    TrackPreview,
  ],
  template: `
    <a routerLink="/playlists" class="text-muted-foreground hover:text-foreground mb-4 inline-block text-sm">
      ← Toutes les playlists
    </a>

    <div class="mb-6">
      <h1 class="text-2xl font-bold tracking-tight">Titres passés</h1>
      <p class="text-muted-foreground text-sm">
        Tes derniers morceaux passés parmi ceux de tes playlists et de tes likes, avec le nombre de fois où tu les
        as passés. Un morceau coché est retiré de toutes les playlists qui le contiennent, toutes versions et likes
        compris.
      </p>
      @if (history.value()?.lastPlayedAt; as last) {
        <p class="text-muted-foreground text-sm">
          D'après ton historique importé, dont la dernière écoute date {{ last | since }}.
        </p>
      }
    </div>

    <app-skip-filter-panel class="mb-6" [(filter)]="filter" />

    <app-removal-outcome [removal]="removal" />

    @if (songs.isLoading() && !songs.items().length) {
      <div hlmSkeleton class="h-96 rounded-xl"></div>
    } @else if (songs.error() && !songs.items().length) {
      <p class="text-destructive" role="alert">Impossible de récupérer tes titres passés.</p>
    } @else if (songs.items().length) {
      <div
        class="bg-background/80 sticky top-14 z-[5] mb-4 flex flex-wrap items-center justify-between gap-3 border-b py-3 backdrop-blur"
      >
        <p class="text-sm" role="status">
          <strong>{{ checkedSongs() | number }}</strong> morceaux sélectionnés
          @if (removal.count()) {
            <span class="text-muted-foreground">
              ({{ removal.count() | number }} titres dans {{ removal.targets().length | number }} playlists)
            </span>
          }
        </p>
        <app-remove-tracks [removal]="removal" />
      </div>

      <ul class="bg-card divide-y rounded-xl border transition-opacity" [class.opacity-60]="songs.isLoading()">
        @for (song of songs.items(); track song.id) {
          @let checked = selected().has(song.id);
          <li class="flex items-center gap-3 px-4 py-2" [class.bg-destructive/10]="checked">
            <hlm-checkbox
              [aria-label]="'Retirer ' + song.name + ' de ses playlists'"
              [disabled]="removal.locked()"
              [checked]="checked"
              (checkedChange)="toggle(song.id, $event)"
            />
            <app-track-preview
              class="size-9 rounded-md"
              [trackId]="song.id"
              [name]="song.name"
              [imageUrl]="artwork(song)"
            />
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium" [class.line-through]="checked" [title]="song.name">
                {{ song.name }}
              </p>
              <p class="text-muted-foreground truncate text-xs">
                {{ song.artistName }} · passé {{ song.skippedAt | since }}
              </p>
              <div class="mt-1 flex flex-wrap gap-1">
                @for (playlist of song.playlists; track playlist.id) {
                  <span hlmBadge variant="secondary">{{ playlist.name }}</span>
                }
              </div>
            </div>
            <div class="shrink-0 text-right">
              <span hlmBadge [variant]="song.skips >= often ? 'destructive' : 'outline'" class="tabular-nums">
                passé {{ song.skips | number }} fois
              </span>
              <p class="text-muted-foreground mt-1 hidden text-xs tabular-nums sm:block">
                sur {{ song.starts | number }} écoutes ({{ song.skips / song.starts | percent }})
              </p>
            </div>
          </li>
        }
      </ul>

      @if (songs.hasMore()) {
        <div class="mt-6 flex flex-col items-center gap-2">
          @if (songs.error()) {
            <p class="text-destructive text-sm" role="alert">Impossible de charger la suite.</p>
          }
          <button hlmBtn variant="outline" size="sm" [disabled]="songs.loadingMore()" (click)="songs.more()">
            {{ songs.loadingMore() ? 'Chargement…' : 'Charger plus' }}
          </button>
        </div>
      }
    } @else if (filter().minSkips || filter().minRate) {
      <p class="text-muted-foreground">Aucun titre de tes playlists ne passe ces seuils.</p>
    } @else {
      <p class="text-muted-foreground">
        Aucun titre de tes playlists passé : <a routerLink="/history" class="underline">importe ton historique</a>
        pour les voir ici.
      </p>
    }
  `,
})
export class SkippedPage {
  /** Seuils depuis l'URL (voir SkipParams). */
  readonly skips = input<string>();
  readonly rate = input<string>();

  private readonly api = inject(PlaylistsApi);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  protected readonly history = inject(HistoryApi).summary();
  protected readonly artwork = trackArtwork;
  protected readonly often = OFTEN;

  /** Seuils de la liste. Modifiés ici, ils sont recopiés dans l'URL. */
  protected readonly filter = linkedSignal<SkipFilter>(() =>
    skipFilterOf({ skips: this.skips(), rate: this.rate() }),
  );

  protected readonly songs = paged<SkippedSong>({
    reset: this.filter,
    first: LIMIT,
    keepPrevious: true,
    load: (page) => this.api.skipped(this.filter, page),
  });

  /** Morceaux cochés, par id. */
  protected readonly selected = signal<ReadonlySet<string>>(new Set());

  /** Morceaux cochés parmi ceux affichés : un changement de seuils peut en cacher. */
  protected readonly checkedSongs = computed(
    () => this.songs.items().filter((song) => this.selected().has(song.id)).length,
  );

  /** Titres des morceaux cochés, par playlist. */
  protected readonly removal = removal({
    targets: () => {
      const byPlaylist = new Map<string, RemovalTarget>();
      for (const song of this.songs.items()) {
        if (!this.selected().has(song.id)) {
          continue;
        }
        for (const playlist of song.playlists) {
          const target = byPlaylist.get(playlist.id) ?? { ...playlist, tracks: [] };
          target.tracks.push(...playlist.tracks);
          byPlaylist.set(playlist.id, target);
        }
      }
      return [...byPlaylist.values()];
    },
    sources: [this.songs],
  });

  constructor() {
    // Seuils dans l'URL, sans navigation : glisser un curseur ne recharge que la liste
    effect(() => {
      const url = this.router.parseUrl(this.router.url);
      url.queryParams = skipParamsOf(this.filter());
      this.location.replaceState(this.router.serializeUrl(url));
    });
  }

  protected toggle(id: string, checked: boolean): void {
    this.selected.update((selected) => {
      const next = new Set(selected);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }
}
