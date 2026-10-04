import { Service, Signal } from '@angular/core';
import { ApiParams, TIMEZONE, apiResource } from './api-resource';
import {
  ArtistStat,
  HourStat,
  MonthStat,
  PlayFilter,
  SongStat,
  StatsOverview,
  TrackStat,
} from './models';
import { Page } from './paged';

/**
 * Stats de l'historique importé, pour le filtre courant. Pendant un changement de filtre,
 * les dernières données restent affichées pour éviter un clignotement.
 */
@Service()
export class StatsApi {
  overview(filter: Signal<PlayFilter>) {
    return stats<StatsOverview>('overview', filter);
  }

  timeline(filter: Signal<PlayFilter>) {
    return stats<MonthStat[]>('timeline', filter);
  }

  /** `page` : tranche du classement, pour le charger par pages. */
  tracks(filter: Signal<PlayFilter | undefined>, page: Signal<Page>) {
    return stats<TrackStat[]>('tracks', filter, () => ({ ...page() }));
  }

  artists(filter: Signal<PlayFilter>, limit: number) {
    return stats<ArtistStat[]>('artists', filter, () => ({ limit }));
  }

  clock(filter: Signal<PlayFilter>) {
    return stats<HourStat[]>('clock', filter);
  }

  /** Historique du morceau d'un titre (id Spotify), sans filtre. */
  song(trackId: Signal<string>) {
    return apiResource<SongStat>(() => ({
      url: `/api/stats/tracks/${trackId()}`,
      params: { tz: TIMEZONE },
    }));
  }
}

/** Sans filtre (`undefined`), rien n'est chargé. */
function stats<T>(
  path: string,
  filter: Signal<PlayFilter | undefined>,
  params: () => ApiParams = () => ({}),
) {
  return apiResource<T>(
    () => {
      const f = filter();
      return f && { url: `/api/stats/${path}`, params: { ...f, ...params(), tz: TIMEZONE } };
    },
    { keepPrevious: true },
  );
}
