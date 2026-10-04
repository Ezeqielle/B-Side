import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { apiResource } from './api-resource';

describe('apiResource', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  const stable = () => TestBed.inject(ApplicationRef).whenStable();

  it('reste en attente pendant un rechargement, sans repasser en chargement', async () => {
    const resource = TestBed.runInInjectionContext(() => apiResource<number[]>(() => ({ url: '/api/test' })));
    TestBed.tick();
    expect(resource.isLoading()).toBe(true);
    expect(resource.pending()).toBe(true);

    http.expectOne('/api/test').flush([1]);
    await stable();
    expect(resource.pending()).toBe(false);

    resource.reload();
    TestBed.tick();
    expect(resource.value()).toEqual([1]);
    expect(resource.isLoading()).toBe(false);
    expect(resource.pending()).toBe(true);

    http.expectOne('/api/test').flush([2]);
    await stable();
    expect(resource.value()).toEqual([2]);
    expect(resource.pending()).toBe(false);
  });
});
