import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable, finalize } from 'rxjs';
import { ApiCache, apiResource } from './api-resource';
import { RemovedTrack } from './models';

/** Journal des titres retirés, et leur remise en place. */
@Service()
export class RemovalsApi {
  private readonly http = inject(HttpClient);
  private readonly cache = inject(ApiCache);

  /** Les plus récents d'abord. */
  list() {
    return apiResource<RemovedTrack[]>(() => ({ url: '/api/removals' }));
  }

  /**
   * Remet les titres en place, sauf ceux dont la playlist a disparu : `restored` peut être inférieur
   * au nombre demandé. Les stats changent : le cache est vidé.
   */
  restore(ids: number[]): Observable<{ restored: number }> {
    return this.http
      .post<{ restored: number }>('/api/removals/restore', { ids })
      .pipe(finalize(() => this.cache.clear()));
  }
}
