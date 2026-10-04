import { Signal, computed, inject, signal } from '@angular/core';
import { concatMap, from } from 'rxjs';
import { PlaylistsApi } from '../../core/playlists-api';

/** Titres à retirer d'une playlist (`id` : id Spotify, ou `LIKED_PLAYLIST_ID`). */
export interface RemovalTarget {
  id: string;
  name: string;
  positions: number[];
}

/** Liste affichée qui dépend des titres retirés : relue après le retrait. */
export interface RemovalSource {
  reload(): void;
  readonly pending: Signal<boolean>;
}

export interface Removal {
  readonly targets: Signal<RemovalTarget[]>;
  /** Titres visés, toutes playlists confondues. */
  readonly count: Signal<number>;
  readonly removing: Signal<boolean>;
  /**
   * Vrai pendant le retrait, puis tant qu'une source se recharge : les positions affichées
   * ne sont plus sûres, on ne peut ni cocher ni retirer.
   */
  readonly locked: Signal<boolean>;
  /** Message du dernier retrait, terminé ou interrompu. */
  readonly outcome: Signal<string | null>;
  remove(): void;
}

/**
 * Retrait de titres d'une ou plusieurs playlists : ils passent par la corbeille et le journal,
 * puis les sources sont relues.
 */
export function removal(options: { targets: () => RemovalTarget[]; sources: RemovalSource[] }): Removal {
  const api = inject(PlaylistsApi);
  const targets = computed(options.targets);
  const removing = signal(false);
  const outcome = signal<string | null>(null);

  const done = (message: string) => {
    removing.set(false);
    outcome.set(message);
    options.sources.forEach((source) => source.reload());
  };

  return {
    targets,
    count: computed(() => targets().reduce((total, target) => total + target.positions.length, 0)),
    removing: removing.asReadonly(),
    locked: computed(() => removing() || options.sources.some((source) => source.pending())),
    outcome: outcome.asReadonly(),
    remove: () => {
      removing.set(true);
      let removed = 0;
      // Une playlist après l'autre : chaque retrait décale les positions de sa seule playlist
      from(targets())
        .pipe(concatMap((target) => api.remove(target.id, target.positions)))
        .subscribe({
          next: (result) => (removed += result.removed),
          complete: () =>
            done(`${removed} titre${removed > 1 ? 's' : ''} retiré${removed > 1 ? 's' : ''}, et mis dans la corbeille.`),
          error: () => done("Le retrait s'est interrompu : les titres déjà retirés sont dans la corbeille."),
        });
    },
  };
}
