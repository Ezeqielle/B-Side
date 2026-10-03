import { HttpClient } from '@angular/common/http';
import { Service, computed, inject } from '@angular/core';
import { Observable, finalize } from 'rxjs';
import { ApiCache, apiResource } from './api-resource';
import { HistorySummary } from './models';

/** Historique d'écoute importé. */
@Service()
export class HistoryApi {
  private readonly http = inject(HttpClient);
  private readonly cache = inject(ApiCache);

  /** Résumé de l'historique. `isEmpty` : rien d'importé, faux tant que le résumé n'est pas connu. */
  summary() {
    const summary = apiResource<HistorySummary>(() => ({ url: '/api/history' }));
    return { ...summary, isEmpty: computed(() => summary.value()?.plays === 0) };
  }

  /** Envoie un fichier `Streaming_History_*.json`, enregistré ensuite en arrière-plan. */
  upload(file: File): Observable<unknown> {
    const body = new FormData();
    body.append('file', file);
    return this.http.post('/api/history', body).pipe(finalize(() => this.cache.clear()));
  }
}
