import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable, concatMap, finalize, first, map, switchMap, take, timer } from 'rxjs';
import { ApiCache, ApiParams, TIMEZONE, apiResource } from './api-resource';
import {
  DuplicateTrack,
  KeptTrack,
  PlaylistOverview,
  PlaylistStat,
  PlaylistTrackStat,
  SongVersion,
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

  /** Versions d'un même morceau, par groupe d'au moins deux, dans l'ordre de la playlist. */
  versions(id: () => string) {
    return playlists<SongVersion[][]>(() => `/${encodeURIComponent(id())}/versions`);
  }

  /** Titres à garder : le nettoyage les laisse décochés. */
  kept(id: () => string) {
    return playlists<KeptTrack[]>(() => `/${encodeURIComponent(id())}/kept`);
  }

  /**
   * Ajoute des titres à garder, ou les rend au nettoyage (`kept` faux).
   * La liste en cache est oubliée : elle sera relue à la prochaine visite.
   */
  keep(id: string, trackIds: string[], kept: boolean): Observable<void> {
    const url = `/api/playlists/${encodeURIComponent(id)}/kept`;
    return this.http
      .post<void>(url, { trackIds, kept })
      .pipe(finalize(() => this.cache.forget(url)));
  }

  duplicates() {
    return playlists<DuplicateTrack[]>('/duplicates');
  }

  /** Titres les plus écoutés absents des playlists. */
  missing(limit: number) {
    return playlists<TrackStat[]>('/missing', { limit });
  }

  /**
   * Retire des titres, par position : ils vont dans la corbeille Spotify et dans le journal.
   * Les stats changent : le cache est vidé.
   */
  remove(id: string, positions: number[]): Observable<{ removed: number }> {
    return this.http
      .post<{ removed: number }>(`/api/playlists/${encodeURIComponent(id)}/remove`, { positions })
      .pipe(finalize(() => this.cache.clear()));
  }

  /**
   * Crée une playlist privée sur Spotify avec ces titres, dans l'ordre. Une synchro suit côté serveur :
   * le cache est vidé.
   */
  create(name: string, trackIds: string[]): Observable<{ id: string }> {
    return this.http
      .post<{ id: string }>('/api/playlists', { name, trackIds })
      .pipe(finalize(() => this.cache.clear()));
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
