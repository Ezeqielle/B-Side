import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import { HlmTabsImports } from '@spartan-ng/helm/tabs';
import { apiResource } from '../../core/api-resource';
import { CreatePlaylist } from '../../core/create-playlist';
import { TimeRange, Track } from '../../core/models';
import { paged } from '../../core/paged';
import { StatsApi } from '../../core/stats-api';
import { trackArtwork } from '../../core/track-preview';
import { TrackStats } from '../stats/track-stats-dialog';
import { CardTrack, TrackCard } from './track-card';

/** Spotify ne remonte pas au-delà d'un an : le top « depuis toujours » vient de l'historique importé. */
type Range = TimeRange | 'all_time';

const LIMIT = 50;

@Component({
  selector: 'app-top-tracks-page',
  imports: [
    RouterLink,
    HlmButtonImports,
    HlmTabsImports,
    HlmSkeletonImports,
    CreatePlaylist,
    TrackCard,
  ],
  template: `
    <div class="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold tracking-tight">Tes titres les plus écoutés</h1>
        <p class="text-muted-foreground text-sm">
          @if (allTime()) {
            D'après ton historique importé, depuis ta première écoute.
          } @else {
            D'après Spotify, sur la période choisie.
          }
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-3">
        <hlm-tabs [tab]="range()" (tabActivated)="range.set($any($event))">
          <hlm-tabs-list aria-label="Période">
            @for (option of ranges; track option.value) {
              <button [hlmTabsTrigger]="option.value">{{ option.label }}</button>
            }
          </hlm-tabs-list>
        </hlm-tabs>
        @if (top.items().length) {
          <app-create-playlist [trackIds]="trackIds()" [namePrefix]="playlistName()" />
        }
      </div>
    </div>

    @if (top.error() && !top.items().length) {
      <p class="text-destructive" role="alert">Impossible de récupérer tes tops pour le moment.</p>
    } @else {
      <div class="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        @if (top.isLoading() && !top.items().length) {
          @for (i of placeholders; track i) {
            <div>
              <div hlmSkeleton class="aspect-square w-full rounded-lg"></div>
              <div hlmSkeleton class="mt-2 h-4 w-3/4"></div>
              <div hlmSkeleton class="mt-1 h-3 w-1/2"></div>
            </div>
          }
        } @else {
          @for (track of top.items(); track track.id; let i = $index) {
            <app-track-card [track]="track" [rank]="i + 1" (opened)="openStats(track)" />
          } @empty {
            <p class="text-muted-foreground col-span-full">
              @if (allTime()) {
                Aucune écoute importée.
                <a routerLink="/history" class="underline underline-offset-4"
                  >Importe ton historique</a
                >
                pour voir ton top depuis toujours.
              } @else {
                Pas encore assez d'écoutes sur cette période.
              }
            </p>
          }
        }
      </div>
      @if (top.hasMore()) {
        <div class="mt-8 flex flex-col items-center gap-2">
          @if (top.error()) {
            <p class="text-destructive text-sm" role="alert">Impossible de charger la suite.</p>
          }
          <button hlmBtn variant="outline" [disabled]="top.loadingMore()" (click)="top.more()">
            {{ top.loadingMore() ? 'Chargement…' : 'Charger plus' }}
          </button>
        </div>
      }
    }
  `,
})
export class TopTracksPage {
  protected readonly ranges: { value: Range; label: string }[] = [
    { value: 'short_term', label: '4 semaines' },
    { value: 'medium_term', label: '6 mois' },
    { value: 'long_term', label: '1 an' },
    { value: 'all_time', label: 'Depuis toujours' },
  ];
  protected readonly placeholders = Array.from({ length: 20 }, (_, i) => i);

  protected readonly range = signal<Range>('short_term');
  protected readonly allTime = computed(() => this.range() === 'all_time');

  private readonly stats = inject(StatsApi);

  protected readonly top = paged<CardTrack>({
    reset: this.range,
    first: LIMIT,
    load: (page) => {
      const spotify = apiResource<Track[]>(() => {
        const range = this.range();
        return range === 'all_time'
          ? undefined
          : { url: '/api/me/top/tracks', params: { range, ...page() } };
      });
      const history = this.stats.tracks(
        computed(() => (this.allTime() ? {} : undefined)),
        page,
      );
      const source = computed(() => (this.allTime() ? history : spotify));
      return {
        value: computed(() =>
          this.allTime()
            ? history.value()?.map((track) => ({
                id: track.id,
                name: track.name,
                artists: [track.artistName],
                album: track.albumName,
                imageUrl: trackArtwork(track),
              }))
            : spotify.value(),
        ),
        isLoading: computed(() => source().isLoading()),
        pending: computed(() => source().pending()),
        error: computed(() => source().error()),
        reload: () => source().reload(),
      };
    },
  });

  protected readonly trackIds = computed(() => this.top.items().map((track) => track.id));

  /** Nom proposé : « Top 4 semaines ». */
  protected readonly playlistName = computed(() => {
    const label = this.ranges.find((option) => option.value === this.range())?.label ?? '';
    return `Top ${label.toLowerCase()}`;
  });

  private readonly trackStats = inject(TrackStats);

  protected openStats(track: CardTrack): void {
    this.trackStats.open({
      id: track.id,
      name: track.name,
      artist: track.artists.join(', '),
      imageUrl: track.imageUrl,
    });
  }
}
