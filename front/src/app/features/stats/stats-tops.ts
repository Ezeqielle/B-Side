import { Component, computed, inject } from '@angular/core';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { StatsApi } from '../../core/stats-api';
import { Ranking, RankingEntry } from './ranking';
import { StatsFilter } from './stats-filter';

const LIMIT = 20;

/** Titres et artistes les plus écoutés pour le filtre courant. Charge ses propres données. */
@Component({
  selector: 'app-stats-tops',
  imports: [HlmCardImports, Ranking],
  template: `
    <div
      class="grid gap-6 transition-opacity"
      [class]="filter.artist() ? '' : 'lg:grid-cols-2'"
      [class.opacity-60]="loading()"
    >
      <section hlmCard>
        <div hlmCardHeader>
          <h2 hlmCardTitle>Titres les plus écoutés</h2>
        </div>
        <div hlmCardContent>
          <app-ranking
            [entries]="trackEntries()"
            empty="Aucun titre écouté plus de 30 secondes sur cette période."
          />
        </div>
      </section>
      @if (!filter.artist()) {
        <section hlmCard>
          <div hlmCardHeader>
            <h2 hlmCardTitle>Artistes les plus écoutés</h2>
            <p hlmCardDescription>Clique sur un artiste pour ne voir que ses écoutes.</p>
          </div>
          <div hlmCardContent>
            <app-ranking
              [entries]="artistEntries()"
              round
              empty="Aucun artiste sur cette période."
            />
          </div>
        </section>
      }
    </div>
  `,
})
export class StatsTops {
  protected readonly filter = inject(StatsFilter);
  private readonly api = inject(StatsApi);

  private readonly tracks = this.api.tracks(this.filter.filter, LIMIT);
  private readonly artists = this.api.artists(this.filter.filter, LIMIT);

  protected readonly loading = computed(() => this.tracks.isLoading() || this.artists.isLoading());

  protected readonly trackEntries = computed(() =>
    (this.tracks.value() ?? []).map((track): RankingEntry => ({
      key: track.id,
      name: track.name,
      artist: track.artistName,
      imageUrl: `/api/artwork/track/${track.id}`,
      trackId: track.id,
      plays: track.plays,
    })),
  );

  protected readonly artistEntries = computed(() =>
    (this.artists.value() ?? []).map((artist): RankingEntry => ({
      key: artist.name,
      name: artist.name,
      artist: artist.name,
      detail: `${artist.tracks.toLocaleString('fr')} titres`,
      imageUrl: `/api/artwork/artist?name=${encodeURIComponent(artist.name)}`,
      plays: artist.plays,
    })),
  );
}
