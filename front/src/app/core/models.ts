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
