import { RemovedTrack } from '../../core/models';

/** Un retrait : les titres d'une playlist retirés en même temps. */
export interface RemovalGroup {
  key: string;
  removedAt: string;
  playlistId: string;
  playlistName: string;
  tracks: RemovedTrack[];
  /** Titres pas encore remis en place. */
  pending: RemovedTrack[];
}

/** Regroupe le journal par retrait, dans l'ordre reçu (les plus récents d'abord). */
export function groupRemovals(removals: readonly RemovedTrack[]): RemovalGroup[] {
  const groups = new Map<string, RemovalGroup>();
  for (const removal of removals) {
    const key = `${removal.removedAt}|${removal.playlistId}`;
    const group = groups.get(key) ?? {
      key,
      removedAt: removal.removedAt,
      playlistId: removal.playlistId,
      playlistName: removal.playlistName,
      tracks: [],
      pending: [],
    };
    group.tracks.push(removal);
    if (!removal.restoredAt) {
      group.pending.push(removal);
    }
    groups.set(key, group);
  }
  return [...groups.values()];
}
