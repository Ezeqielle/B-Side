import { SongVersion } from '../../core/models';

/**
 * Version gardée par défaut : celle d'un album (pas d'un single, ni d'un album d'un seul titre) s'il y en a,
 * puis la plus anciennement ajoutée (date inconnue : très ancienne), la plus haute à égalité.
 */
export function defaultKept(group: readonly SongVersion[]): number {
  const albums = group.filter(onAlbum);
  const added = (version: SongVersion) =>
    version.track.addedAt ? Date.parse(version.track.addedAt) : Number.NEGATIVE_INFINITY;
  return (albums.length ? albums : group).reduce((kept, version) => (added(version) < added(kept) ? version : kept))
    .track.position;
}

function onAlbum({ track }: SongVersion): boolean {
  return track.albumType === 'album' && (track.albumTracks ?? 0) > 1;
}

/**
 * Cochée par défaut pour être retirée : même enregistrement que la version gardée, ou n'importe quelle
 * autre version avec `others`. La version gardée ne l'est jamais.
 */
export function removedByDefault(version: SongVersion, kept: SongVersion, others: boolean): boolean {
  return version !== kept && (others || version.recording === kept.recording);
}

/** Durée en `m:ss`. */
export function minutes(ms: number | null): string {
  if (ms === null) {
    return '—';
  }
  const seconds = Math.round(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
