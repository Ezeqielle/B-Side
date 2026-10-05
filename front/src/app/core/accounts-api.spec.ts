import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AccountsApi } from './accounts-api';
import { ApiCache } from './api-resource';

describe('AccountsApi.unlink', () => {
  it('délie le compte, puis oublie la liste en cache', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const api = TestBed.inject(AccountsApi);
    const http = TestBed.inject(HttpTestingController);
    const cache = TestBed.inject(ApiCache);
    cache.set('/api/accounts?', [{ id: 'other', displayName: 'Jane Pro', avatarUrl: null }]);
    cache.set('/api/playlists?tz=Europe/Paris', []);

    api.unlink('other').subscribe();
    http
      .expectOne({ method: 'DELETE', url: '/api/accounts/other' })
      .flush(null, { status: 204, statusText: 'No Content' });

    expect(cache.has('/api/accounts?')).toBe(false);
    expect(cache.has('/api/playlists?tz=Europe/Paris')).toBe(true);
    http.verify();
  });
});
