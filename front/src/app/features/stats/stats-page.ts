import { httpResource } from '@angular/common/http';
import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import {
  ArtistStat,
  HistorySummary,
  HourStat,
  MonthStat,
  PlayFilter,
  StatsOverview,
  TrackStat,
} from '../../core/models';
import { ListeningClock } from './listening-clock';
import { StatTiles } from './stat-tiles';
import { statsResource } from './stats-resource';
import { TimelineChart } from './timeline-chart';
import { TopArtists } from './top-artists';
import { TopTracks } from './top-tracks';

/**
 * Stats de l'historique importé. Le filtre (année, artiste) vit dans l'URL : partageable,
 * et chaque vue peut le modifier par un simple lien.
 */
@Component({
  selector: 'app-stats-page',
  imports: [
    RouterLink,
    HlmBadgeImports,
    HlmButtonImports,
    HlmCardImports,
    HlmSkeletonImports,
    ListeningClock,
    StatTiles,
    TimelineChart,
    TopArtists,
    TopTracks,
  ],
  template: `
    <div class="mb-6">
      <h1 class="text-2xl font-bold tracking-tight">Tes stats</h1>
      <p class="text-muted-foreground text-sm">
        D'après ton historique importé. Une écoute ne compte qu'au-delà de 30 secondes.
      </p>
    </div>

    <nav class="mb-6 flex flex-wrap items-center gap-1" aria-label="Période">
      <a
        hlmBtn
        size="xs"
        [variant]="year() ? 'ghost' : 'secondary'"
        [routerLink]="[]"
        [queryParams]="{ year: null }"
        queryParamsHandling="merge"
        [attr.aria-current]="year() ? null : 'true'"
        >Tout</a
      >
      @for (y of years(); track y) {
        <a
          hlmBtn
          size="xs"
          [variant]="year() === y ? 'secondary' : 'ghost'"
          [routerLink]="[]"
          [queryParams]="{ year: y }"
          queryParamsHandling="merge"
          [attr.aria-current]="year() === y ? 'true' : null"
          >{{ y }}</a
        >
      }
      @if (artist(); as name) {
        <span hlmBadge variant="outline" class="ml-auto h-6 gap-1.5 pr-1">
          {{ name }}
          <a
            [routerLink]="[]"
            [queryParams]="{ artist: null }"
            queryParamsHandling="merge"
            class="hover:bg-muted rounded-full px-1"
            [attr.aria-label]="'Retirer le filtre ' + name"
            >✕</a
          >
        </span>
      }
    </nav>

    @if (overview.error()) {
      <p class="text-destructive" role="alert">Impossible de calculer tes stats pour le moment.</p>
    } @else if (overview.value(); as o) {
      @if (!o.plays && !year() && !artist()) {
        <p class="text-muted-foreground">
          Pas encore d'écoutes :
          <a routerLink="/history" class="text-foreground underline">importe ton historique</a> pour
          voir tes stats.
        </p>
      } @else {
        <div class="grid gap-6 transition-opacity" [class.opacity-60]="loading()">
          <app-stat-tiles [overview]="o" />

          <section hlmCard>
            <div hlmCardHeader>
              <h2 hlmCardTitle>Écoutes par mois</h2>
            </div>
            <div hlmCardContent>
              <app-timeline-chart [months]="timeline.value() ?? []" />
            </div>
          </section>

          <div class="grid gap-6" [class]="artist() ? '' : 'lg:grid-cols-2'">
            <section hlmCard>
              <div hlmCardHeader>
                <h2 hlmCardTitle>Titres les plus écoutés</h2>
              </div>
              <div hlmCardContent>
                <app-top-tracks [tracks]="tracks.value() ?? []" />
              </div>
            </section>
            @if (!artist()) {
              <section hlmCard>
                <div hlmCardHeader>
                  <h2 hlmCardTitle>Artistes les plus écoutés</h2>
                  <p hlmCardDescription>Clique sur un artiste pour ne voir que ses écoutes.</p>
                </div>
                <div hlmCardContent>
                  <app-top-artists [artists]="artists.value() ?? []" />
                </div>
              </section>
            }
          </div>

          <section hlmCard>
            <div hlmCardHeader>
              <h2 hlmCardTitle>Quand tu écoutes</h2>
              <p hlmCardDescription>Par jour de la semaine et par heure.</p>
            </div>
            <div hlmCardContent>
              <app-listening-clock [stats]="clock.value() ?? []" />
            </div>
          </section>
        </div>
      }
    } @else {
      <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        @for (i of [1, 2, 3, 4, 5]; track i) {
          <div hlmSkeleton class="h-20 rounded-xl"></div>
        }
      </div>
      <div hlmSkeleton class="mt-6 h-72 rounded-xl"></div>
    }
  `,
})
export class StatsPage {
  /** Query params `?year=2021&artist=…`, liés par le routeur. */
  readonly year = input<string>();
  readonly artist = input<string>();

  protected readonly filter = computed<PlayFilter>(() => {
    const year = this.year();
    return {
      from: year && `${year}-01-01`,
      to: year && `${year}-12-31`,
      artist: this.artist(),
    };
  });

  protected readonly overview = statsResource<StatsOverview>('overview', this.filter);
  protected readonly timeline = statsResource<MonthStat[]>('timeline', this.filter);
  protected readonly tracks = statsResource<TrackStat[]>('tracks', this.filter, { limit: 20 });
  protected readonly artists = statsResource<ArtistStat[]>('artists', this.filter, { limit: 20 });
  protected readonly clock = statsResource<HourStat[]>('clock', this.filter);

  protected readonly loading = computed(() =>
    [this.overview, this.timeline, this.tracks, this.artists, this.clock].some((r) =>
      r.isLoading(),
    ),
  );

  private readonly history = httpResource<HistorySummary>(() => '/api/history');

  /** Années couvertes par l'historique, de la plus récente à la plus ancienne. */
  protected readonly years = computed(() => {
    const summary = this.history.hasValue() ? this.history.value() : undefined;
    if (!summary?.firstPlayedAt || !summary.lastPlayedAt) {
      return [];
    }
    const [first, last] = [summary.firstPlayedAt, summary.lastPlayedAt].map((d) =>
      Number(d.slice(0, 4)),
    );
    return Array.from({ length: last - first + 1 }, (_, i) => String(last - i));
  });
}
