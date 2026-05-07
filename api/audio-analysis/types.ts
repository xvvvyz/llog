export type AudioFile = {
  assetKey?: string | null;
  duration?: number | null;
  id: string;
  isIdentifying?: boolean | null;
  isTranscribing?: boolean | null;
  mimeType?: string | null;
  name?: string | null;
  tracks?: unknown;
  transcript?: string | null;
  type?: string | null;
  uri?: string | null;
};

export type MusicTrackLink = { provider: string; url: string };

export type MusicTrack = {
  album?: string;
  artists: string[];
  artwork?: string;
  end: number;
  genres?: string[];
  isrc?: string;
  label?: string;
  links?: MusicTrackLink[];
  releaseDate?: string;
  score: number;
  start: number;
  title: string;
  trackDuration?: number;
  upc?: string;
};
