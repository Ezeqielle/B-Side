import { httpResource } from '@angular/common/http';
import { Component, signal } from '@angular/core';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import { HlmTabsImports } from '@spartan-ng/helm/tabs';
import { TimeRange, Track } from '../../core/models';
import { TrackCard } from './track-card';

@Component({
  selector: 'app-top-tracks-page',
  imports: [HlmTabsImports, HlmSkeletonImports, TrackCard],
  template: `
    <div class="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold tracking-tight">Tes titres les plus écoutés</h1>
        <p class="text-muted-foreground text-sm">D'après Spotify, sur la période choisie.</p>
      </div>
      <hlm-tabs [tab]="range()" (tabActivated)="range.set($any($event))">
        <hlm-tabs-list aria-label="Période">
          @for (option of ranges; track option.value) {
            <button [hlmTabsTrigger]="option.value">{{ option.label }}</button>
          }
        </hlm-tabs-list>
      </hlm-tabs>
    </div>

    @if (tracks.error()) {
      <p class="text-destructive" role="alert">Impossible de récupérer tes tops pour le moment.</p>
    } @else {
      <div class="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        @if (tracks.isLoading()) {
          @for (i of placeholders; track i) {
            <div>
              <div hlmSkeleton class="aspect-square w-full rounded-lg"></div>
              <div hlmSkeleton class="mt-2 h-4 w-3/4"></div>
              <div hlmSkeleton class="mt-1 h-3 w-1/2"></div>
            </div>
          }
        } @else {
          @for (track of tracks.value(); track track.id; let i = $index) {
            <app-track-card [track]="track" [rank]="i + 1" />
          } @empty {
            <p class="text-muted-foreground col-span-full">Pas encore assez d'écoutes sur cette période.</p>
          }
        }
      </div>
    }
  `,
})
export class TopTracksPage {
  protected readonly ranges: { value: TimeRange; label: string }[] = [
    { value: 'short_term', label: '4 semaines' },
    { value: 'medium_term', label: '6 mois' },
    { value: 'long_term', label: '1 an' },
  ];
  protected readonly placeholders = Array.from({ length: 20 }, (_, i) => i);

  protected readonly range = signal<TimeRange>('short_term');

  protected readonly tracks = httpResource<Track[]>(
    () => ({ url: '/api/me/top/tracks', params: { range: this.range() } }),
    { defaultValue: [] },
  );
}
