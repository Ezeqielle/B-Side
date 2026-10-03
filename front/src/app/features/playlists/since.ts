import { Pipe, PipeTransform } from '@angular/core';

const format = new Intl.RelativeTimeFormat('fr', { numeric: 'auto' });

const DAY = 86_400_000;
const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * DAY],
  ['month', 30 * DAY],
  ['week', 7 * DAY],
  ['day', DAY],
];

/** Date ISO en durée écoulée : « il y a 3 mois ». `empty` si la date est absente. */
@Pipe({ name: 'since' })
export class SincePipe implements PipeTransform {
  transform(value: string | null, empty = '—'): string {
    if (!value) {
      return empty;
    }
    const elapsed = Date.now() - Date.parse(value);
    for (const [unit, ms] of UNITS) {
      if (elapsed >= ms) {
        return format.format(-Math.floor(elapsed / ms), unit);
      }
    }
    return format.format(0, 'day');
  }
}
