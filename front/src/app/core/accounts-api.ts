import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable, finalize } from 'rxjs';
import { ApiCache, apiResource } from './api-resource';
import { LinkedAccount } from './models';

const URL = '/api/accounts';

/** Autres comptes Spotify de l'utilisateur, liés en s'y connectant depuis sa session. */
@Service()
export class AccountsApi {
  private readonly http = inject(HttpClient);
  private readonly cache = inject(ApiCache);

  list() {
    return apiResource<LinkedAccount[]>(() => ({ url: URL }));
  }

  /** Part chez Spotify, qui demande quel compte autoriser, puis revient sur la page des comptes. */
  link(): void {
    window.location.assign(`${URL}/link`);
  }

  unlink(id: string): Observable<void> {
    return this.http
      .delete<void>(`${URL}/${encodeURIComponent(id)}`)
      .pipe(finalize(() => this.cache.forget(URL)));
  }
}
