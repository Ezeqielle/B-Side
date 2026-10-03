import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable, concatMap, finalize, first, map, switchMap, take, timer } from 'rxjs';
import { ApiCache, ApiParams, TIMEZONE, apiResource } from './api-resource';
import {
  DuplicateTrack,
  PlaylistOverview,
  PlaylistStat,
  PlaylistTrackStat,
  TrackStat,
} from './models';

/** Attente entre deux vérifications de la fin d'une synchro, et nombre maximum de vérifications (3 min). */
export const SYNC_POLL_MS = 2000;
export const SYNC_POLL_MAX = 90;

/** Playlists recopiées depuis Spotify, et leurs stats croisées avec l'historique. */
@Service()
export class PlaylistsApi {
  private readonly http = inject(HttpClient);
  private readonly cache = inject(ApiCache);

  list() {
    return playlists<PlaylistStat[]>('');
  }

  overview() {
    return playlists<PlaylistOverview>('/overview');
  }

  playlist(id: () => string) {
    return playlists<PlaylistStat>(() => `/${encodeURIComponent(id())}`);
  }

  tracks(id: () => string) {
    return playlists<PlaylistTrackStat[]>(() => `/${encodeURIComponent(id())}/tracks`);
  }

  duplicates() {
    return playlists<DuplicateTrack[]>('/duplicates');
  }

  /** Titres les plus écoutés absents des playlists. */
  missing(limit: number) {
    return playlists<TrackStat[]>('/missing', { limit });
  }

  /**
   * Lance la synchro, puis vérifie toutes les 2 s, pendant 3 min au plus, si `syncedAt` a changé.
   * Se termine dans tous les cas : il suffit alors de tout recharger. Se désabonner arrête l'attente.
   */
  sync(before: string | null): Observable<void> {
    return this.http.post('/api/playlists/sync', null).pipe(
      switchMap(() => timer(SYNC_POLL_MS, SYNC_POLL_MS)),
      take(SYNC_POLL_MAX),
      concatMap(() =>
        this.http.get<PlaylistOverview>('/api/playlists/overview', { params: { tz: TIMEZONE } }),
      ),
      first((overview) => overview.syncedAt !== before, null),
      map(() => undefined),
      finalize(() => this.cache.clear()),
    );
  }
}

function playlists<T>(path: string | (() => string), params: ApiParams = {}) {
  return apiResource<T>(() => ({
    url: `/api/playlists${typeof path === 'string' ? path : path()}`,
    params: { ...params, tz: TIMEZONE },
  }));
}
