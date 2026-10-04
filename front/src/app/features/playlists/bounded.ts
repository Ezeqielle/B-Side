/** Bornes d'un curseur, et valeur à l'activation de son critère. */
export interface Bounds {
  min: number;
  max: number;
  initial: number;
}

/** Valeur de l'URL ramenée dans ses bornes, `null` si absente ou invalide. */
export function bounded(value: string | undefined, { min, max }: Bounds): number | null {
  const n = Math.trunc(Number(value));
  return value && Number.isFinite(n) ? Math.min(Math.max(n, min), max) : null;
}
