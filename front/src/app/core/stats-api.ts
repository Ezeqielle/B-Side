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

  tracks(filter: Signal<PlayFilter | undefined>, limit: number) {
    return stats<TrackStat[]>('tracks', filter, limit);
  }

  artists(filter: Signal<PlayFilter>, limit: number) {
    return stats<ArtistStat[]>('artists', filter, limit);
  }

  clock(filter: Signal<PlayFilter>) {
    return stats<HourStat[]>('clock', filter);
  }
}

/** Sans filtre (`undefined`), rien n'est chargé. */
function stats<T>(path: string, filter: Signal<PlayFilter | undefined>, limit?: number) {
  return apiResource<T>(
    () => {
      const f = filter();
      return f && { url: `/api/stats/${path}`, params: { ...f, limit, tz: TIMEZONE } };
    },
    { keepPrevious: true },
  );
}
