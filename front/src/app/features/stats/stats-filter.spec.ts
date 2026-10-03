import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { StatsFilter, filterOf, periodOf } from './stats-filter';

describe('periodOf', () => {
  it("couvre l'année entière, bornes incluses", () => {
    expect(periodOf('2021')).toEqual({ from: '2021-01-01', to: '2021-12-31' });
  });

  it('ne restreint rien sans année', () => {
    expect(periodOf(undefined)).toEqual({});
    expect(filterOf({ artist: 'Daft Punk' })).toEqual({ artist: 'Daft Punk' });
  });
});

describe('StatsFilter', () => {
  let router: Router;
  let filter: StatsFilter;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([{ path: '**', children: [] }])],
    });
    router = TestBed.inject(Router);
    filter = TestBed.inject(StatsFilter);
  });

  it("lit le filtre dans l'URL des stats", async () => {
    await router.navigateByUrl('/stats?year=2021&artist=Daft%20Punk');

    expect(filter.filter()).toEqual({ from: '2021-01-01', to: '2021-12-31', artist: 'Daft Punk' });
  });

  it('fait des liens qui gardent le reste du filtre', async () => {
    await router.navigateByUrl('/stats?year=2021');

    expect(router.serializeUrl(filter.link({ artist: 'Daft Punk' }))).toBe(
      '/stats?year=2021&artist=Daft%20Punk',
    );
    expect(router.serializeUrl(filter.link({ year: null }))).toBe('/stats');
  });

  it('ne reprend pas le filtre depuis une autre page', async () => {
    await router.navigateByUrl('/playlists?year=2021');

    expect(router.serializeUrl(filter.link({ artist: 'Daft Punk' }))).toBe(
      '/stats?artist=Daft%20Punk',
    );
  });
});
