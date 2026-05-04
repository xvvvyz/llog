export type AudioOrigin = 'recorded' | 'uploaded';

export type AudioAnalysisJob = { fileId: string; origin: AudioOrigin };

export type AudioFile = {
  assetKey?: string | null;
  duration?: number | null;
  id: string;
  mimeType?: string | null;
  name?: string | null;
  tracks?: unknown;
  transcript?: string | null;
  type?: string | null;
  uri?: string | null;
};

export type MusicTrackArtwork = {
  large?: string;
  medium?: string;
  original?: string;
  small?: string;
};

export type MusicTrackLink = {
  albumId?: string;
  provider: string;
  trackId?: string;
  url: string;
};

export type MusicTrack = {
  acrid?: string;
  album?: string;
  artists: string[];
  artwork?: MusicTrackArtwork;
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
