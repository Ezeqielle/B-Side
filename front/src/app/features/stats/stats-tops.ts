import { Component, computed, inject } from '@angular/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { CreatePlaylist } from '../../core/create-playlist';
import { TrackStat } from '../../core/models';
import { paged } from '../../core/paged';
import { StatsApi } from '../../core/stats-api';
import { trackArtwork } from '../../core/track-preview';
import { Ranking, RankingEntry } from './ranking';
import { StatsFilter } from './stats-filter';

const LIMIT = 20;
/** Titres ajoutés par « Charger plus ». */
const STEP = 10;

/** Titres et artistes les plus écoutés pour le filtre courant. Charge ses propres données. */
@Component({
  selector: 'app-stats-tops',
  imports: [HlmButtonImports, HlmCardImports, CreatePlaylist, Ranking],
  template: `
    <div
      class="grid items-start gap-6 transition-opacity"
      [class]="filter.artist() ? '' : 'lg:grid-cols-2'"
      [class.opacity-60]="loading()"
    >
      <section hlmCard>
        <div hlmCardHeader>
          <h2 hlmCardTitle>Titres les plus écoutés</h2>
          @if (trackIds().length) {
            <div hlmCardAction>
              <app-create-playlist [trackIds]="trackIds()" [namePrefix]="playlistName()" />
            </div>
          }
        </div>
        <div hlmCardContent>
          <app-ranking
            [entries]="trackEntries()"
            empty="Aucun titre écouté plus de 30 secondes sur cette période."
          />
          @if (tracks.hasMore()) {
            <div class="mt-6 flex flex-col items-center gap-2">
              @if (tracks.error()) {
                <p class="text-destructive text-sm" role="alert">Impossible de charger la suite.</p>
              }
              <button
                hlmBtn
                variant="outline"
                size="sm"
                [disabled]="tracks.loadingMore()"
                (click)="tracks.more()"
              >
                {{ tracks.loadingMore() ? 'Chargement…' : 'Charger plus' }}
              </button>
            </div>
          }
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

  protected readonly tracks = paged<TrackStat>({
    reset: this.filter.filter,
    first: LIMIT,
    step: STEP,
    keepPrevious: true,
    load: (page) => this.api.tracks(this.filter.filter, page),
  });
  private readonly artists = this.api.artists(this.filter.filter, LIMIT);

  protected readonly loading = computed(() => this.tracks.isLoading() || this.artists.isLoading());

  protected readonly trackEntries = computed(() =>
    this.tracks.items().map((track): RankingEntry => ({
      key: track.id,
      name: track.name,
      artist: track.artistName,
      imageUrl: trackArtwork(track),
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

  protected readonly trackIds = computed(() => this.tracks.items().map((track) => track.id));

  /** Nom proposé : « Top Daft Punk 2021 ». */
  protected readonly playlistName = computed(() => {
    const scope = [this.filter.artist(), this.filter.year() ?? 'depuis toujours'].filter(Boolean);
    return `Top ${scope.join(' ')}`;
  });
}
