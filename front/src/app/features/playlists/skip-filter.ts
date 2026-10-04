import { SkipFilter } from '../../core/models';
import { UrlCodec } from '../../core/url-state';
import { Bounds, bounded } from './bounded';

/** Bornes des curseurs, et valeurs à l'activation d'un seuil. */
export const SKIPS: Bounds = { min: 1, max: 20, initial: 3 };
export const RATE: Bounds = { min: 5, max: 100, initial: 50 };

/** Query params des seuils : `?skips=3&rate=60`. */
export type SkipParams = Partial<Record<'skips' | 'rate', string>>;

export function skipParamsOf(filter: SkipFilter): SkipParams {
  return {
    ...(filter.minSkips !== null ? { skips: String(filter.minSkips) } : {}),
    ...(filter.minRate !== null ? { rate: String(filter.minRate) } : {}),
  };
}

/** Seuils de l'URL : une valeur absente ou invalide désactive le seuil, une valeur hors bornes y est ramenée. */
export function skipFilterOf(params: SkipParams): SkipFilter {
  return {
    minSkips: bounded(params.skips, SKIPS),
    minRate: bounded(params.rate, RATE),
  };
}

/** Seuils dans l'URL de la page des titres passés. */
export const SKIP_PARAMS: UrlCodec<SkipFilter> = {
  keys: ['skips', 'rate'],
  parse: skipFilterOf,
  serialize: skipParamsOf,
};
