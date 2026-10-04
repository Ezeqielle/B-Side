import { signal } from '@angular/core';
import { describe, expect, it } from 'vitest';
import { ApiResource } from './api-resource';
import { Page, paged } from './paged';

/** Fausse API : chaque page demandée est remplie à la main par `respond`. */
function setup(options: { keepPrevious?: boolean } = {}) {
  const reset = signal('a');
  const value = signal<number[] | undefined>(undefined);
  const isLoading = signal(true);
  let requested: () => Page = () => ({ offset: -1, limit: -1 });
  let reloads = 0;
  const list = paged<number>({
    reset,
    first: 3,
    step: 2,
    ...options,
    load: (page): ApiResource<number[]> => {
      requested = page;
      return { value, isLoading, pending: isLoading, error: signal(undefined), reload: () => reloads++ };
    },
  });
  const respond = (items: number[]) => {
    value.set(items);
    isLoading.set(false);
  };
  const more = () => {
    list.more();
    isLoading.set(true);
  };
  const restart = (key: string) => {
    reset.set(key);
    isLoading.set(true);
  };
  const reload = () => {
    isLoading.set(true);
    list.reload();
  };
  return { list, respond, more, restart, reload, page: () => requested(), reloads: () => reloads };
}

describe('paged', () => {
  it('charge `first` entrées puis `step` de plus', () => {
    const { list, respond, more, page } = setup();
    expect(page()).toEqual({ offset: 0, limit: 3 });
    respond([1, 2, 3]);
    expect(list.items()).toEqual([1, 2, 3]);
    expect(list.hasMore()).toBe(true);

    more();
    expect(page()).toEqual({ offset: 3, limit: 2 });
    expect(list.loadingMore()).toBe(true);
    expect(list.items()).toEqual([1, 2, 3]);
    respond([4, 5]);
    expect(list.items()).toEqual([1, 2, 3, 4, 5]);

    more();
    expect(page()).toEqual({ offset: 5, limit: 2 });
    respond([6]);
    expect(list.items()).toEqual([1, 2, 3, 4, 5, 6]);
    expect(list.hasMore()).toBe(false);
  });

  it('repart de la première page quand `reset` change', () => {
    const { list, respond, more, restart, page } = setup();
    respond([1, 2, 3]);
    more();
    respond([4, 5]);

    restart('b');
    expect(page()).toEqual({ offset: 0, limit: 3 });
    expect(list.isLoading()).toBe(true);
    expect(list.items()).toEqual([]);
    respond([7, 8, 9]);
    expect(list.items()).toEqual([7, 8, 9]);
  });

  it('garde les entrées pendant le rechargement avec `keepPrevious`', () => {
    const { list, respond, restart } = setup({ keepPrevious: true });
    respond([1, 2, 3]);
    expect(list.items()).toEqual([1, 2, 3]);

    restart('b');
    expect(list.items()).toEqual([1, 2, 3]);
    respond([7]);
    expect(list.items()).toEqual([7]);
    expect(list.hasMore()).toBe(false);
  });

  it('relit la première page avec `reload`', () => {
    const { list, respond, more, page, reloads } = setup();
    respond([1, 2, 3]);
    list.reload();
    expect(reloads()).toBe(1);

    more();
    respond([4, 5]);
    list.reload();
    expect(page()).toEqual({ offset: 0, limit: 3 });
    expect(reloads()).toBe(1);
  });

  it('reste en attente pendant le rechargement après « Charger plus »', () => {
    const { list, respond, more, reload, page } = setup({ keepPrevious: true });
    respond([1, 2, 3]);
    expect(list.items()).toEqual([1, 2, 3]);
    more();
    respond([4, 5]);
    expect(list.items()).toEqual([1, 2, 3, 4, 5]);
    expect(list.pending()).toBe(false);

    reload();
    expect(page()).toEqual({ offset: 0, limit: 3 });
    expect(list.items()).toEqual([1, 2, 3, 4, 5]);
    expect(list.pending()).toBe(true);
    respond([1, 3, 4]);
    expect(list.pending()).toBe(false);
    expect(list.items()).toEqual([1, 3, 4]);
  });
});
