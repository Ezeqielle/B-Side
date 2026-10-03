import { Service, Signal } from '@angular/core';
import { TIMEZONE, apiResource } from './api-resource';
import { ArtistStat, HourStat, MonthStat, PlayFilter, StatsOverview, TrackStat } from './models';

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

  tracks(filter: Signal<PlayFilter>, limit: number) {
    return stats<TrackStat[]>('tracks', filter, limit);
  }

  artists(filter: Signal<PlayFilter>, limit: number) {
    return stats<ArtistStat[]>('artists', filter, limit);
  }

  clock(filter: Signal<PlayFilter>) {
    return stats<HourStat[]>('clock', filter);
  }
}

function stats<T>(path: string, filter: Signal<PlayFilter>, limit?: number) {
  return apiResource<T>(
    () => ({ url: `/api/stats/${path}`, params: { ...filter(), limit, tz: TIMEZONE } }),
    { keepPrevious: true },
  );
}
