import { SkipFilter } from '../../core/models';

/** Bornes des curseurs, et valeurs à l'activation d'un seuil. */
export const SKIPS = { min: 1, max: 20, initial: 3 };
export const RATE = { min: 5, max: 100, initial: 50 };

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

function bounded(value: string | undefined, { min, max }: { min: number; max: number }): number | null {
  const n = Math.trunc(Number(value));
  return value && Number.isFinite(n) ? Math.min(Math.max(n, min), max) : null;
}
