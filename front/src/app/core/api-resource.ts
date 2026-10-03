import { httpResource } from '@angular/common/http';
import { Service, Signal, computed, inject, linkedSignal } from '@angular/core';

/** Fuseau du navigateur : périodes et heures d'écoute sont celles de l'utilisateur. */
export const TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;

/** Les valeurs vides ne sont pas envoyées. */
export type ApiParams = Record<string, string | number | null | undefined>;

export interface ApiRequest {
  url: string;
  params?: ApiParams;
}

export interface ApiResource<T> {
  /** Réponse à la requête courante, sinon la dernière connue pour cette requête. */
  readonly value: Signal<T | undefined>;
  /** Vrai seulement quand ce qui est affiché ne correspond pas encore à la requête courante. */
  readonly isLoading: Signal<boolean>;
  readonly error: Signal<unknown>;
  reload(): void;
}

/**
 * Dernière réponse connue de chaque requête, pour la durée de la visite. Les données ne changent
 * qu'après un import ou une synchro : le cache est vidé à ce moment-là.
 */
@Service()
export class ApiCache {
  private readonly values = new Map<string, unknown>();

  get(key: string): unknown {
    return this.values.get(key);
  }

  has(key: string): boolean {
    return this.values.has(key);
  }

  set(key: string, value: unknown): void {
    this.values.set(key, value);
  }

  /** Oublie les réponses d'une URL, quels que soient leurs paramètres. */
  forget(url: string): void {
    for (const key of this.values.keys()) {
      if (key.startsWith(`${url}?`)) {
        this.values.delete(key);
      }
    }
  }

  clear(): void {
    this.values.clear();
  }
}

/**
 * Charge une URL de l'API : la dernière réponse connue s'affiche tout de suite, puis est rafraîchie en fond.
 * `keepPrevious` garde l'ancienne réponse pendant le chargement d'une autre requête, sans clignotement.
 */
export function apiResource<T>(
  request: () => ApiRequest | undefined,
  options: { keepPrevious?: boolean } = {},
): ApiResource<T> {
  const cache = inject(ApiCache);

  const normalized = computed(
    () => {
      const r = request();
      return r && { url: r.url, params: withoutEmpty(r.params ?? {}) };
    },
    { equal: (a, b) => (a && keyOf(a)) === (b && keyOf(b)) },
  );
  const key = computed(() => {
    const r = normalized();
    return r && keyOf(r);
  });

  const resource = httpResource<T>(() => normalized());

  const value = linkedSignal<{ key: string | undefined; fresh: T | undefined }, T | undefined>({
    source: () => ({ key: key(), fresh: resource.hasValue() ? resource.value() : undefined }),
    computation: ({ key, fresh }, previous) => {
      if (key === undefined) {
        return undefined;
      }
      if (fresh !== undefined) {
        cache.set(key, fresh);
        return fresh;
      }
      if (cache.has(key)) {
        return cache.get(key) as T;
      }
      return options.keepPrevious ? previous?.value : undefined;
    },
  });

  const isLoading = computed(() => {
    const k = key();
    return resource.isLoading() && !resource.hasValue() && (k === undefined || !cache.has(k));
  });

  return {
    value: value.asReadonly(),
    isLoading,
    error: resource.error,
    reload: () => resource.reload(),
  };
}

function withoutEmpty(params: ApiParams): Record<string, string | number> {
  return Object.fromEntries(
    Object.entries(params).filter(
      (entry): entry is [string, string | number] =>
        entry[1] !== null && entry[1] !== undefined && entry[1] !== '',
    ),
  );
}

function keyOf({ url, params }: { url: string; params: Record<string, string | number> }): string {
  const query = Object.keys(params)
    .sort()
    .map((name) => `${name}=${params[name]}`)
    .join('&');
  return `${url}?${query}`;
}
