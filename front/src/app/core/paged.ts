import { Signal, computed, linkedSignal } from '@angular/core';
import { ApiResource } from './api-resource';

/** Tranche demandée à l'API. */
export interface Page {
  offset: number;
  limit: number;
}

export interface Paged<T> {
  /** Entrées des pages chargées, dans l'ordre. */
  readonly items: Signal<T[]>;
  /** Chargement de la première page. */
  readonly isLoading: Signal<boolean>;
  /** Chargement de la page suivante. */
  readonly loadingMore: Signal<boolean>;
  readonly error: Signal<unknown>;
  /** Une page incomplète est la dernière. */
  readonly hasMore: Signal<boolean>;
  /** Charge la page suivante, ou réessaie celle qui a échoué. */
  more(): void;
}

/**
 * Liste chargée par pages : `first` entrées, puis `step` de plus à chaque `more()`.
 * Repart de la première page quand `reset` change. `keepPrevious` garde les entrées affichées
 * pendant ce rechargement, sans clignotement.
 */
export function paged<T>(options: {
  reset: () => unknown;
  first: number;
  step?: number;
  keepPrevious?: boolean;
  load: (page: Signal<Page>) => ApiResource<T[]>;
}): Paged<T> {
  const { first, step = first } = options;

  const offset = linkedSignal({ source: options.reset, computation: () => 0 });
  const page = computed(() => ({ offset: offset(), limit: offset() ? step : first }));
  const source = options.load(page);

  /** Dernière page demandée, une fois chargée. */
  const loaded = computed(() => (source.isLoading() ? undefined : source.value()));

  const pages = linkedSignal<{ offset: number; items: T[] | undefined }, T[][]>({
    source: () => ({ offset: offset(), items: loaded() }),
    computation: ({ offset, items }, previous) => {
      const restart = offset === 0 && !(items === undefined && options.keepPrevious);
      const pages = restart ? [] : [...(previous?.value ?? [])];
      if (items) {
        pages[offset ? 1 + (offset - first) / step : 0] = items;
      }
      return pages;
    },
  });

  return {
    items: computed(() => pages().flat()),
    isLoading: computed(() => source.isLoading() && !offset()),
    loadingMore: computed(() => source.isLoading() && !!offset()),
    error: source.error,
    hasMore: computed(() => {
      const last = pages().length - 1;
      return pages()[last]?.length === (last ? step : first);
    }),
    more: () => {
      if (source.error()) {
        source.reload();
      } else {
        offset.set(page().offset + page().limit);
      }
    },
  };
}
