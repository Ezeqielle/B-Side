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
