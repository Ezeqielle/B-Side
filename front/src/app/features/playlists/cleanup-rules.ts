import { PlaylistTrackStat } from '../../core/models';
import { Bounds, bounded } from './bounded';

const MONTH = 30 * 86_400_000;

/** Bornes des curseurs, et valeurs à l'activation d'un critère : mois, mois, %, lancements. */
export const ADDED: Bounds = { min: 0, max: 24, initial: 6 };
export const IDLE: Bounds = { min: 1, max: 60, initial: 24 };
export const SKIP: Bounds = { min: 30, max: 100, initial: 60 };
export const STARTS: Bounds = { min: 1, max: 20, initial: 3 };

/**
 * Titres à retirer d'une playlist : ceux ajoutés depuis assez longtemps (protection), et qui répondent
 * à au moins un critère activé. Les durées se comptent jusqu'à la dernière écoute importée, pas
 * jusqu'à aujourd'hui : un historique ancien ne fait pas passer les ajouts récents pour oubliés.
 */
export interface CleanupRules {
  /** Ajouté au moins N mois avant : 0 ne protège rien. */
  addedMonths: number;
  /** Jamais écouté au-delà de 30 secondes. */
  never: boolean;
  /** Plus écouté depuis N mois, `null` si critère désactivé. */
  idleMonths: number | null;
  /** Passé au moins cette part de ses lancements (0 à 1), `null` si critère désactivé… */
  skipRate: number | null;
  /** …sur au moins N lancements. */
  minStarts: number;
}

const NONE: CleanupRules = {
  addedMonths: ADDED.initial,
  never: false,
  idleMonths: null,
  skipRate: null,
  minStarts: STARTS.initial,
};

export const PRESETS: readonly { label: string; rules: CleanupRules }[] = [
  { label: 'Jamais écoutés', rules: { ...NONE, never: true } },
  { label: 'Oubliés', rules: { ...NONE, never: true, idleMonths: IDLE.initial } },
  { label: 'Souvent passés', rules: { ...NONE, skipRate: SKIP.initial / 100 } },
];

/** Mêmes règles, sans tenir compte du minimum de lancements quand le critère est désactivé. */
export function sameRules(a: CleanupRules, b: CleanupRules): boolean {
  return (
    a.addedMonths === b.addedMonths &&
    a.never === b.never &&
    a.idleMonths === b.idleMonths &&
    a.skipRate === b.skipRate &&
    (a.skipRate === null || a.minStarts === b.minStarts)
  );
}

/** @param reference date de la dernière écoute importée, en ms */
export function matchesRules(track: PlaylistTrackStat, rules: CleanupRules, reference: number): boolean {
  // Date d'ajout inconnue : playlist très ancienne, rien à protéger
  if (track.addedAt && Date.parse(track.addedAt) > reference - rules.addedMonths * MONTH) {
    return false;
  }
  return (
    (rules.never && track.plays === 0) ||
    (rules.idleMonths !== null &&
      track.lastPlayedAt !== null &&
      Date.parse(track.lastPlayedAt) < reference - rules.idleMonths * MONTH) ||
    (rules.skipRate !== null && track.starts >= rules.minStarts && track.skipRate >= rules.skipRate)
  );
}

/** Query params des règles : `?added=6&never=1&idle=24&skip=60&starts=3`. */
export type CleanupParams = Partial<Record<'added' | 'never' | 'idle' | 'skip' | 'starts', string>>;

export function paramsOf(rules: CleanupRules): CleanupParams {
  return {
    added: String(rules.addedMonths),
    ...(rules.never ? { never: '1' } : {}),
    ...(rules.idleMonths !== null ? { idle: String(rules.idleMonths) } : {}),
    ...(rules.skipRate !== null
      ? { skip: String(Math.round(rules.skipRate * 100)), starts: String(rules.minStarts) }
      : {}),
  };
}

/**
 * Règles de l'URL, `null` sans règle : la page n'est pas en mode nettoyage. Une valeur hors bornes y est
 * ramenée, une valeur invalide désactive son critère.
 */
export function rulesOf(params: CleanupParams): CleanupRules | null {
  if (params.added === undefined) {
    return null;
  }
  const skip = bounded(params.skip, SKIP);
  return {
    addedMonths: bounded(params.added, ADDED) ?? ADDED.min,
    never: params.never === '1',
    idleMonths: bounded(params.idle, IDLE),
    skipRate: skip !== null ? skip / 100 : null,
    minStarts: bounded(params.starts, STARTS) ?? STARTS.initial,
  };
}

/** « 6 mois », « 2 ans », « 18 mois ». */
export function months(n: number): string {
  return n >= 12 && n % 12 === 0 ? `${n / 12} an${n > 12 ? 's' : ''}` : `${n} mois`;
}
