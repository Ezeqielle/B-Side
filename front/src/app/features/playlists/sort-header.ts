import { Component, computed, input, model } from '@angular/core';

export interface Sort {
  key: string;
  desc: boolean;
}

/** Valeur de tri d'une ligne : `null` est toujours classé à la fin. */
export function sortRows<T>(
  rows: readonly T[],
  value: (row: T) => string | number | null,
  desc: boolean,
): T[] {
  return [...rows].sort((a, b) => {
    const [x, y] = [value(a), value(b)];
    if (x === y) return 0;
    if (x === null) return 1;
    if (y === null) return -1;
    const order = typeof x === 'string' ? x.localeCompare(String(y), 'fr') : x - Number(y);
    return desc ? -order : order;
  });
}

/**
 * En-tête de colonne cliquable : trie sur `appSortHeader`, puis inverse l'ordre au clic suivant.
 */
@Component({
  selector: 'th[appSortHeader]',
  host: { scope: 'col', '[attr.aria-sort]': 'ariaSort()' },
  template: `
    <button
      type="button"
      class="hover:text-foreground inline-flex items-center gap-1 font-medium"
      [class.text-foreground]="active()"
      (click)="toggle()"
    >
      <ng-content />
      <span class="w-3" aria-hidden="true">{{ active() ? (sort().desc ? '↓' : '↑') : '' }}</span>
    </button>
  `,
})
export class SortHeader {
  readonly appSortHeader = input.required<string>();
  readonly sort = model.required<Sort>();
  /** Sens du premier clic : décroissant pour les nombres, croissant pour les noms. */
  readonly desc = input(true);

  protected readonly active = computed(() => this.sort().key === this.appSortHeader());
  protected readonly ariaSort = computed(() =>
    this.active() ? (this.sort().desc ? 'descending' : 'ascending') : null,
  );

  protected toggle(): void {
    this.sort.set({
      key: this.appSortHeader(),
      desc: this.active() ? !this.sort().desc : this.desc(),
    });
  }
}
