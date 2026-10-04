import { Signal, computed, inject, signal } from '@angular/core';
import { TrackPosition } from '../../core/models';
import { PlaylistsApi } from '../../core/playlists-api';

/** Titres à retirer d'une playlist (`id` : id Spotify, ou `LIKED_PLAYLIST_ID`). */
export interface RemovalTarget {
  id: string;
  name: string;
  tracks: TrackPosition[];
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
 * Retrait de titres d'une ou plusieurs playlists, en une requête : ils passent par la corbeille
 * et le journal, puis les sources sont relues.
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
    count: computed(() => targets().reduce((total, target) => total + target.tracks.length, 0)),
    removing: removing.asReadonly(),
    locked: computed(() => removing() || options.sources.some((source) => source.pending())),
    outcome: outcome.asReadonly(),
    remove: () => {
      removing.set(true);
      api.remove(targets().map(({ id, tracks }) => ({ playlistId: id, tracks }))).subscribe({
        next: ({ removed, skipped }) => done(outcomeOf(removed, skipped)),
        error: () => done("Le retrait s'est interrompu : les titres déjà retirés sont dans la corbeille."),
      });
    },
  };
}

function outcomeOf(removed: number, skipped: number): string {
  const s = (count: number) => (count > 1 ? 's' : '');
  const message = `${removed} titre${s(removed)} retiré${s(removed)}, et mis dans la corbeille.`;
  return skipped
    ? `${message} ${skipped} titre${s(skipped)} avai${skipped > 1 ? 'en' : ''}t bougé depuis l'affichage : laissé${s(skipped)} en place.`
    : message;
}
