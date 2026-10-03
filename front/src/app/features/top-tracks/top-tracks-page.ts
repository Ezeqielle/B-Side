import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import { HlmTabsImports } from '@spartan-ng/helm/tabs';
import { apiResource } from '../../core/api-resource';
import { TimeRange, Track } from '../../core/models';
import { StatsApi } from '../../core/stats-api';
import { CardTrack, TrackCard } from './track-card';

/** Spotify ne remonte pas au-delà d'un an : le top « depuis toujours » vient de l'historique importé. */
type Range = TimeRange | 'all_time';

const LIMIT = 50;

@Component({
  selector: 'app-top-tracks-page',
  imports: [RouterLink, HlmTabsImports, HlmSkeletonImports, TrackCard],
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
      <hlm-tabs [tab]="range()" (tabActivated)="range.set($any($event))">
        <hlm-tabs-list aria-label="Période">
          @for (option of ranges; track option.value) {
            <button [hlmTabsTrigger]="option.value">{{ option.label }}</button>
          }
        </hlm-tabs-list>
      </hlm-tabs>
    </div>

    @if (error()) {
      <p class="text-destructive" role="alert">Impossible de récupérer tes tops pour le moment.</p>
    } @else {
      <div class="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        @if (loading()) {
          @for (i of placeholders; track i) {
            <div>
              <div hlmSkeleton class="aspect-square w-full rounded-lg"></div>
              <div hlmSkeleton class="mt-2 h-4 w-3/4"></div>
              <div hlmSkeleton class="mt-1 h-3 w-1/2"></div>
            </div>
          }
        } @else {
          @for (track of tracks(); track track.id; let i = $index) {
            <app-track-card [track]="track" [rank]="i + 1" />
          } @empty {
            <p class="text-muted-foreground col-span-full">
              @if (allTime()) {
                Aucune écoute importée.
                <a routerLink="/history" class="underline underline-offset-4">Importe ton historique</a>
                pour voir ton top depuis toujours.
              } @else {
                Pas encore assez d'écoutes sur cette période.
              }
            </p>
          }
        }
      </div>
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

  private readonly spotify = apiResource<Track[]>(() => {
    const range = this.range();
    return range === 'all_time' ? undefined : { url: '/api/me/top/tracks', params: { range } };
  });

  private readonly history = inject(StatsApi).tracks(
    computed(() => (this.allTime() ? {} : undefined)),
    LIMIT,
  );

  private readonly source = computed(() => (this.allTime() ? this.history : this.spotify));
  protected readonly loading = computed(() => this.source().isLoading());
  protected readonly error = computed(() => this.source().error());

  protected readonly tracks = computed((): CardTrack[] =>
    this.allTime()
      ? (this.history.value() ?? []).map((track) => ({
          id: track.id,
          name: track.name,
          artists: [track.artistName],
          album: track.albumName,
          imageUrl: `/api/artwork/track/${track.id}`,
        }))
      : (this.spotify.value() ?? []),
  );
}
