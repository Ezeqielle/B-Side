import { httpResource } from '@angular/common/http';
import { Signal, linkedSignal } from '@angular/core';
import { PlayFilter } from '../../core/models';

/** Fuseau du navigateur : périodes et heures d'écoute sont celles de l'utilisateur. */
const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

/**
 * Charge `/api/stats/{path}` pour le filtre courant, et garde les dernières données
 * pendant un rechargement pour éviter un clignotement à chaque changement de filtre.
 */
export function statsResource<T>(
  path: string,
  filter: Signal<PlayFilter>,
  params: Record<string, number> = {},
) {
  const resource = httpResource<T>(() => ({
    url: `/api/stats/${path}`,
    params: { ...withoutEmpty(filter()), ...params, tz },
  }));

  const value = linkedSignal<T | undefined, T | undefined>({
    source: () => (resource.hasValue() ? resource.value() : undefined),
    computation: (value, previous) => value ?? previous?.value,
  });

  return { value: value.asReadonly(), isLoading: resource.isLoading, error: resource.error };
}

function withoutEmpty(filter: PlayFilter): Record<string, string> {
  return Object.fromEntries(Object.entries(filter).filter(([, value]) => !!value));
}
