import { Service, computed, inject, linkedSignal } from '@angular/core';
import { Router, UrlTree } from '@angular/router';
import { PlayFilter } from '../../core/models';

/** Query params de `/stats`. */
export interface StatsParams {
  year?: string;
  artist?: string;
}

/** Une année devient la période du 1er janvier au 31 décembre. */
export function periodOf(year: string | undefined): Pick<PlayFilter, 'from' | 'to'> {
  return year ? { from: `${year}-01-01`, to: `${year}-12-31` } : {};
}

export function filterOf({ year, artist }: StatsParams): PlayFilter {
  return { ...periodOf(year), ...(artist ? { artist } : {}) };
}

/**
 * Filtre des stats, rangé dans l'URL (`/stats?year=2021&artist=…`) : partageable, et chaque vue
 * le modifie par un simple lien, construit ici.
 */
@Service()
export class StatsFilter {
  private readonly router = inject(Router);

  /** URL visée par la navigation en cours, sinon l'URL affichée. */
  private readonly url = computed(
    () =>
      (this.router.currentNavigation() ?? this.router.lastSuccessfulNavigation())?.finalUrl ??
      this.router.parseUrl(this.router.url),
  );

  private readonly onStats = computed(() => isStats(this.url()));

  /** Dernier filtre de `/stats` : il ne change pas pendant qu'on quitte la page. */
  private readonly params = linkedSignal<StatsParams | null, StatsParams>({
    source: () => (this.onStats() ? paramsOf(this.url()) : null),
    computation: (params, previous) => params ?? previous?.value ?? {},
    equal: (a, b) => a.year === b.year && a.artist === b.artist,
  });

  readonly year = computed(() => this.params().year);
  readonly artist = computed(() => this.params().artist);
  readonly filter = computed(() => filterOf(this.params()));

  /** Lien vers `/stats` avec ce changement, le reste du filtre courant gardé. `null` retire un critère. */
  link(change: { year?: string | null; artist?: string | null }): UrlTree {
    const queryParams = { ...(this.onStats() ? this.params() : {}), ...change };
    return this.router.createUrlTree(['/stats'], {
      queryParams: Object.fromEntries(Object.entries(queryParams).filter(([, value]) => !!value)),
    });
  }
}

function isStats(url: UrlTree): boolean {
  return url.root.children['primary']?.segments.map((s) => s.path).join('/') === 'stats';
}

function paramsOf(url: UrlTree): StatsParams {
  const [year, artist] = ['year', 'artist'].map((name) => url.queryParamMap.get(name) || undefined);
  return { year, artist };
}
