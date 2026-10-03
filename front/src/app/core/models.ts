export interface Me {
  id: string;
  displayName: string | null;
  avatarUrl: string | null;
}

export interface Track {
  id: string;
  uri: string;
  name: string;
  artists: string[];
  album: string;
  imageUrl: string | null;
  durationMs: number;
  isrc: string | null;
}

/** Périodes des tops Spotify : ~4 semaines, ~6 mois, ~1 an. */
export type TimeRange = 'short_term' | 'medium_term' | 'long_term';

/** Historique d'écoute étendu importé. Dates ISO 8601. */
export interface HistorySummary {
  plays: number;
  tracks: number;
  firstPlayedAt: string | null;
  lastPlayedAt: string | null;
}

/** Sélection d'écoutes, commune à toutes les stats. Dates `yyyy-MM-dd`, bornes incluses. */
export interface PlayFilter {
  from?: string;
  to?: string;
  artist?: string;
}

/** Une écoute ne compte qu'au-delà de 30 secondes, `msPlayed` inclut tout. */
export interface StatsOverview {
  plays: number;
  msPlayed: number;
  tracks: number;
  artists: number;
  skipRate: number;
}

export interface TrackStat {
  id: string;
  name: string;
  artistName: string;
  albumName: string;
  imageUrl: string | null;
  plays: number;
  msPlayed: number;
  skipRate: number;
  lastPlayedAt: string;
}

export interface ArtistStat {
  name: string;
  plays: number;
  msPlayed: number;
  tracks: number;
}

/** `month` au format `yyyy-MM`. */
export interface MonthStat {
  month: string;
  plays: number;
  msPlayed: number;
}

/** `weekday` : 1 = lundi … 7 = dimanche. */
export interface HourStat {
  weekday: number;
  hour: number;
  plays: number;
}

/**
 * Playlists recopiées depuis Spotify. `syncedAt` est null avant la première synchro,
 * et change à la fin de chacune. Les titres sont comptés une fois, même s'ils sont dans plusieurs playlists.
 */
export interface PlaylistOverview {
  syncedAt: string | null;
  /** Sans les titres likés. */
  playlists: number;
  /** Playlists suivies dont Spotify ne donne pas le contenu. */
  unreadable: number;
  tracks: number;
  neverPlayed: number;
  duplicates: number;
}

/** Id des titres likés, rangés comme une playlist. */
export const LIKED_PLAYLIST_ID = 'liked';

/** `id` : id Spotify, ou `LIKED_PLAYLIST_ID`. `skipRate` : part des écoutes de ses titres qui ont été passées. */
export interface PlaylistStat {
  id: string;
  name: string;
  ownerName: string;
  imageUrl: string | null;
  tracks: number;
  artists: number;
  durationMs: number;
  neverPlayed: number;
  skipRate: number;
  lastPlayedAt: string | null;
  lastAddedAt: string | null;
}

/** `plays` : écoutes de plus de 30 s, `starts` : toutes, base de `skipRate`. */
export interface PlaylistTrackStat {
  position: number;
  id: string;
  name: string;
  artistName: string;
  albumName: string;
  durationMs: number | null;
  imageUrl: string | null;
  /** `album`, `single` ou `compilation`, inconnu avant la synchro des playlists. */
  albumType: string | null;
  albumTracks: number | null;
  addedAt: string | null;
  plays: number;
  starts: number;
  skipRate: number;
  lastPlayedAt: string | null;
}

/**
 * Version d'un morceau dans une playlist : single, album, remix… `recording` est la position du premier
 * titre du même enregistrement, égale pour deux versions identiques.
 */
export interface SongVersion {
  track: PlaylistTrackStat;
  recording: number;
}

/** `playlists` : noms des playlists, répétés si le titre y est en double. */
export interface DuplicateTrack {
  id: string;
  name: string;
  artistName: string;
  imageUrl: string | null;
  playlists: string[];
}

/**
 * Titre retiré d'une playlist (`playlistId`, ou `LIKED_PLAYLIST_ID`) et mis dans la corbeille.
 * Les titres d'un même retrait partagent leur `removedAt`. `restoredAt` : remis en place.
 */
export interface RemovedTrack {
  id: number;
  trackId: string;
  name: string;
  artistName: string;
  albumName: string;
  imageUrl: string | null;
  playlistId: string;
  playlistName: string;
  position: number;
  addedAt: string | null;
  removedAt: string;
  restoredAt: string | null;
}
