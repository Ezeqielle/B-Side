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

/** Raison de retirer un titre, décidée par le serveur : jamais écouté, ou passé au moins une fois sur deux. */
export type TrackCleanup = 'never_played' | 'often_skipped';

export interface PlaylistTrackStat {
  position: number;
  id: string;
  name: string;
  artistName: string;
  albumName: string;
  durationMs: number | null;
  addedAt: string | null;
  plays: number;
  skipRate: number;
  lastPlayedAt: string | null;
  cleanup: TrackCleanup | null;
}

/** `playlists` : noms des playlists, répétés si le titre y est en double. */
export interface DuplicateTrack {
  id: string;
  name: string;
  artistName: string;
  playlists: string[];
}
