import { Location } from '@angular/common';
import { provideLocationMocks } from '@angular/common/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { UrlCodec, urlState } from './url-state';

/** `?n=3` : un nombre, `null` sans param. */
const codec: UrlCodec<number | null> = {
  keys: ['n'],
  parse: (params) => (params['n'] ? Number(params['n']) : null),
  serialize: (n) => (n === null ? {} : { n: String(n) }),
};

describe('urlState', () => {
  let router: Router;
  let location: Location;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [provideRouter([{ path: '**', children: [] }]), provideLocationMocks()],
    });
    router = TestBed.inject(Router);
    location = TestBed.inject(Location);
    await router.navigateByUrl('/page?n=3&other=x');
  });

  const state = () => TestBed.runInInjectionContext(() => urlState(codec));

  it("lit l'état dans l'URL", () => {
    expect(state()()).toBe(3);
  });

  it("recopie l'état dans l'URL sans naviguer, en gardant les autres params", () => {
    const n = state();
    n.set(5);
    TestBed.tick();
    expect(location.path()).toBe('/page?other=x&n=5');

    n.set(null);
    TestBed.tick();
    expect(location.path()).toBe('/page?other=x');
    expect(router.url).toBe('/page?n=3&other=x');
  });

  it('suit une navigation vers la même page', async () => {
    const n = state();
    await router.navigateByUrl('/page?n=7');
    expect(n()).toBe(7);
  });
});
