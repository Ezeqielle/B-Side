import { PlaylistTrackStat } from '../../core/models';

const MONTH = 30 * 86_400_000;
const MIN_STARTS = 3;

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

export const PRESETS: readonly { label: string; rules: CleanupRules }[] = [
  {
    label: 'Jamais écoutés',
    rules: { addedMonths: 6, never: true, idleMonths: null, skipRate: null, minStarts: MIN_STARTS },
  },
  {
    label: 'Oubliés',
    rules: { addedMonths: 6, never: true, idleMonths: 24, skipRate: null, minStarts: MIN_STARTS },
  },
  {
    label: 'Souvent passés',
    rules: { addedMonths: 6, never: false, idleMonths: null, skipRate: 0.6, minStarts: MIN_STARTS },
  },
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

/** Règles de l'URL, `null` sans règle : la page n'est pas en mode nettoyage. */
export function rulesOf(params: CleanupParams): CleanupRules | null {
  if (params.added === undefined) {
    return null;
  }
  const number = (value: string | undefined) => {
    const n = Number(value);
    return value !== undefined && value !== '' && Number.isFinite(n) && n >= 0 ? n : null;
  };
  const skip = number(params.skip);
  return {
    addedMonths: number(params.added) ?? 0,
    never: params.never === '1',
    idleMonths: number(params.idle),
    skipRate: skip !== null ? Math.min(skip, 100) / 100 : null,
    minStarts: number(params.starts) || MIN_STARTS,
  };
}

/** « 6 mois », « 2 ans », « 18 mois ». */
export function months(n: number): string {
  return n >= 12 && n % 12 === 0 ? `${n / 12} an${n > 12 ? 's' : ''}` : `${n} mois`;
}
