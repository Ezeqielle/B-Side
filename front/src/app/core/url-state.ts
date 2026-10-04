import { Location } from '@angular/common';
import { WritableSignal, effect, inject, linkedSignal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Params, Router } from '@angular/router';

/** Traduction d'un état en query params, et retour. `keys` : les params qui lui appartiennent. */
export interface UrlCodec<T> {
  readonly keys: readonly string[];
  parse(params: Params): T;
  serialize(value: T): Params;
}

/**
 * État d'une page gardé dans son URL : lu dans les query params de la route active, puis recopié
 * à chaque changement, sans navigation (glisser un curseur ne recharge rien). Les autres params restent.
 */
export function urlState<T>(codec: UrlCodec<T>): WritableSignal<T> {
  const router = inject(Router);
  const location = inject(Location);
  const params = toSignal(inject(ActivatedRoute).queryParams, { requireSync: true });
  const state = linkedSignal(() => codec.parse(params()));

  effect(() => {
    const url = router.parseUrl(router.url);
    const others = Object.entries(url.queryParams).filter(([key]) => !codec.keys.includes(key));
    url.queryParams = { ...Object.fromEntries(others), ...codec.serialize(state()) };
    location.replaceState(router.serializeUrl(url));
  });

  return state;
}
