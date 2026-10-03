import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import { HistoryApi } from '../../core/history-api';
import { StatsApi } from '../../core/stats-api';
import { StatTiles } from './stat-tiles';
import { StatsClock } from './stats-clock';
import { StatsFilter } from './stats-filter';
import { StatsTops } from './stats-tops';
import { TimelineChart } from './timeline-chart';

/**
 * Stats de l'historique importé, pour le filtre de l'URL (année, artiste). Le bas de la page,
 * tops et heures d'écoute, n'est chargé qu'en arrivant à l'écran.
 */
@Component({
  selector: 'app-stats-page',
  imports: [
    RouterLink,
    HlmBadgeImports,
    HlmButtonImports,
    HlmCardImports,
    HlmSkeletonImports,
    StatTiles,
    StatsClock,
    StatsTops,
    TimelineChart,
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
        [routerLink]="allYearsLink()"
        [attr.aria-current]="year() ? null : 'true'"
        >Tout</a
      >
      @for (y of years(); track y.year) {
        <a
          hlmBtn
          size="xs"
          [variant]="year() === y.year ? 'secondary' : 'ghost'"
          [routerLink]="y.link"
          [attr.aria-current]="year() === y.year ? 'true' : null"
          >{{ y.year }}</a
        >
      }
      @if (artist(); as name) {
        <span hlmBadge variant="outline" class="ml-auto h-6 gap-1.5 pr-1">
          {{ name }}
          <a
            [routerLink]="allArtistsLink()"
            class="hover:bg-muted rounded-full px-1"
            [attr.aria-label]="'Retirer le filtre ' + name"
            >✕</a
          >
        </span>
      }
    </nav>

    @if (overview.error()) {
      <p class="text-destructive" role="alert">Impossible de calculer tes stats pour le moment.</p>
    } @else if (history.isEmpty()) {
      <p class="text-muted-foreground">
        Pas encore d'écoutes :
        <a routerLink="/history" class="text-foreground underline">importe ton historique</a> pour
        voir tes stats.
      </p>
    } @else if (overview.value(); as o) {
      <div class="grid gap-6">
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
        </div>

        @defer (on viewport) {
          <app-stats-tops />
        } @placeholder {
          <div hlmSkeleton class="h-96 rounded-xl"></div>
        }

        @defer (on viewport) {
          <app-stats-clock />
        } @placeholder {
          <div hlmSkeleton class="h-72 rounded-xl"></div>
        }
      </div>
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
  private readonly filter = inject(StatsFilter);
  private readonly api = inject(StatsApi);

  protected readonly year = this.filter.year;
  protected readonly artist = this.filter.artist;

  protected readonly overview = this.api.overview(this.filter.filter);
  protected readonly timeline = this.api.timeline(this.filter.filter);
  protected readonly history = inject(HistoryApi).summary();

  protected readonly loading = computed(
    () => this.overview.isLoading() || this.timeline.isLoading(),
  );

  protected readonly allYearsLink = computed(() => this.filter.link({ year: null }));
  protected readonly allArtistsLink = computed(() => this.filter.link({ artist: null }));

  /** Années couvertes par l'historique, de la plus récente à la plus ancienne. */
  protected readonly years = computed(() => {
    const summary = this.history.value();
    if (!summary?.firstPlayedAt || !summary.lastPlayedAt) {
      return [];
    }
    const [first, last] = [summary.firstPlayedAt, summary.lastPlayedAt].map((d) =>
      Number(d.slice(0, 4)),
    );
    return Array.from({ length: last - first + 1 }, (_, i) => {
      const year = String(last - i);
      return { year, link: this.filter.link({ year }) };
    });
  });
}
