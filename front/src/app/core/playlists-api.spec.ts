import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ApiCache } from './api-resource';
import { PlaylistsApi, SYNC_POLL_MS } from './playlists-api';

describe('PlaylistsApi.sync', () => {
  let api: PlaylistsApi;
  let http: HttpTestingController;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(PlaylistsApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    vi.useRealTimers();
  });

  const overview = (syncedAt: string | null) =>
    http.expectOne((req) => req.url === '/api/playlists/overview').flush({ syncedAt });

  it('attend que la date de synchro change, puis vide le cache', () => {
    const cache = TestBed.inject(ApiCache);
    cache.set('/api/playlists?', []);
    const done = vi.fn();

    api.sync('2026-10-01T10:00:00+00:00').subscribe({ complete: done });
    http
      .expectOne({ method: 'POST', url: '/api/playlists/sync' })
      .flush(null, { status: 202, statusText: 'Accepted' });

    vi.advanceTimersByTime(SYNC_POLL_MS);
    overview('2026-10-01T10:00:00+00:00');
    expect(done).not.toHaveBeenCalled();

    vi.advanceTimersByTime(SYNC_POLL_MS);
    overview('2026-10-03T10:00:00+00:00');
    expect(done).toHaveBeenCalled();
    expect(cache.has('/api/playlists?')).toBe(false);

    vi.advanceTimersByTime(SYNC_POLL_MS * 5);
    http.expectNone('/api/playlists/overview');
  });

  it("cesse d'attendre une fois désabonné", () => {
    const subscription = api.sync(null).subscribe();
    http.expectOne('/api/playlists/sync').flush(null);

    vi.advanceTimersByTime(SYNC_POLL_MS);
    overview(null);
    subscription.unsubscribe();

    vi.advanceTimersByTime(SYNC_POLL_MS * 5);
    http.expectNone((req) => req.url === '/api/playlists/overview');
  });
});

describe('PlaylistsApi.keep', () => {
  it('enregistre les titres à garder, puis oublie la liste en cache', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const api = TestBed.inject(PlaylistsApi);
    const http = TestBed.inject(HttpTestingController);
    const cache = TestBed.inject(ApiCache);
    cache.set('/api/playlists/mix/kept?tz=Europe/Paris', []);
    cache.set('/api/playlists/mix/tracks?tz=Europe/Paris', []);

    api.keep('mix', ['a', 'b'], true).subscribe();
    const req = http.expectOne({ method: 'POST', url: '/api/playlists/mix/kept' });
    expect(req.request.body).toEqual({ trackIds: ['a', 'b'], kept: true });
    req.flush(null, { status: 204, statusText: 'No Content' });

    expect(cache.has('/api/playlists/mix/kept?tz=Europe/Paris')).toBe(false);
    expect(cache.has('/api/playlists/mix/tracks?tz=Europe/Paris')).toBe(true);
    http.verify();
  });
});

describe('PlaylistsApi.create', () => {
  it('crée la playlist avec les titres, puis vide le cache', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const api = TestBed.inject(PlaylistsApi);
    const http = TestBed.inject(HttpTestingController);
    const cache = TestBed.inject(ApiCache);
    cache.set('/api/playlists?tz=Europe/Paris', []);

    let created: { id: string } | undefined;
    api.create('Top 4 semaines', ['a', 'b']).subscribe((value) => (created = value));
    const req = http.expectOne({ method: 'POST', url: '/api/playlists' });
    expect(req.request.body).toEqual({ name: 'Top 4 semaines', trackIds: ['a', 'b'] });
    req.flush({ id: 'new' }, { status: 201, statusText: 'Created' });

    expect(created).toEqual({ id: 'new' });
    expect(cache.has('/api/playlists?tz=Europe/Paris')).toBe(false);
    http.verify();
  });
});
