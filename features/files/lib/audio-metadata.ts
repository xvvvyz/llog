import { asNumber, asString, isRecord } from '@/lib/coerce';
import { durationMsToSeconds } from '@/lib/duration';

export type AudioTrackArtwork = {
  large?: string;
  medium?: string;
  original?: string;
  small?: string;
};

export type AudioTrackLink = { provider: string; url: string };

export type AudioMetadataTrack = {
  album?: string;
  artistText: string;
  artwork?: AudioTrackArtwork;
  links: AudioTrackLink[];
  startSeconds: number;
  title: string;
};

export type AudioMediaSessionArtwork = {
  sizes?: string;
  src: string;
  type?: string;
};

export type AudioMediaSessionMetadata = {
  album?: string;
  artist: string;
  artwork?: AudioMediaSessionArtwork[];
  title: string;
};

export type AudioTrackNavigationState = {
  canSeekNext: boolean;
  canSeekPrevious: boolean;
  currentIndex: number;
  currentTrack?: AudioMetadataTrack;
  isNearCurrentTrackStart: boolean;
  nextIndex: number;
  pendingIndex: number;
  previousIndex: number;
};

const UNKNOWN_ARTIST = 'Unknown artist';

export const TRACK_START_THRESHOLD_SECONDS = 2;

const getArtwork = (value: unknown): AudioTrackArtwork | undefined => {
  if (!isRecord(value)) return;
  const artwork: AudioTrackArtwork = {};
  const small = asString(value.small);
  const medium = asString(value.medium);
  const large = asString(value.large);
  const original = asString(value.original);
  if (small) artwork.small = small;
  if (medium) artwork.medium = medium;
  if (large) artwork.large = large;
  if (original) artwork.original = original;
  return Object.keys(artwork).length ? artwork : undefined;
};

const getArtistText = (value: unknown) => {
  const artists = Array.isArray(value)
    ? value
        .map((artist) => asString(artist))
        .filter((artist): artist is string => !!artist)
    : [];

  return artists.length ? artists.join(', ') : UNKNOWN_ARTIST;
};

const PROVIDER_ORDER = ['spotify', 'applemusic', 'youtube', 'deezer'];

const getProviderOrder = (provider: string) => {
  const index = PROVIDER_ORDER.indexOf(provider);
  return index === -1 ? PROVIDER_ORDER.length : index;
};

const getTrackLinks = (value: unknown): AudioTrackLink[] => {
  if (!Array.isArray(value)) return [];
  const linksByProvider = new Map<string, AudioTrackLink>();

  for (const item of value) {
    if (!isRecord(item)) continue;
    const provider = asString(item.provider);
    const url = asString(item.url);
    if (!provider || !url) continue;
    if (linksByProvider.has(provider)) continue;
    linksByProvider.set(provider, { provider, url });
  }

  return [...linksByProvider.values()].sort(
    (a, b) => getProviderOrder(a.provider) - getProviderOrder(b.provider)
  );
};

export const getTrackArtworkUri = (track: AudioMetadataTrack) =>
  track.artwork?.small ??
  track.artwork?.medium ??
  track.artwork?.large ??
  track.artwork?.original;

export const getTrackMediaSessionArtwork = (
  track: AudioMetadataTrack
): AudioMediaSessionArtwork[] | undefined => {
  const artwork = track.artwork;
  if (!artwork) return;

  const variants: Array<[keyof AudioTrackArtwork, string]> = [
    ['small', '96x96'],
    ['medium', '256x256'],
    ['large', '512x512'],
  ];

  const seen = new Set<string>();

  const mediaArtwork: AudioMediaSessionArtwork[] = variants.flatMap(
    ([key, sizes]) => {
      const src = artwork[key];
      if (!src || seen.has(src)) return [];
      seen.add(src);
      return [{ sizes, src }];
    }
  );

  if (!mediaArtwork.length && artwork.original) {
    mediaArtwork.push({ src: artwork.original });
  }

  return mediaArtwork.length ? mediaArtwork : undefined;
};

export const getTrackMediaSessionMetadata = (
  track: AudioMetadataTrack
): AudioMediaSessionMetadata => ({
  ...(track.album ? { album: track.album } : {}),
  artist: track.artistText,
  artwork: getTrackMediaSessionArtwork(track),
  title: track.title,
});

export const parseAudioTracks = (value: unknown): AudioMetadataTrack[] => {
  if (!Array.isArray(value)) return [];

  return value
    .flatMap((item) => {
      if (!isRecord(item)) return [];
      const title = asString(item.title);
      const start = asNumber(item.start);
      if (!title || start == null) return [];

      return [
        {
          ...(asString(item.album) ? { album: asString(item.album) } : {}),
          artistText: getArtistText(item.artists),
          artwork: getArtwork(item.artwork),
          links: getTrackLinks(item.links),
          startSeconds: durationMsToSeconds(start) ?? 0,
          title,
        },
      ];
    })
    .sort((a, b) => a.startSeconds - b.startSeconds);
};

export const getCurrentTrackIndex = (
  tracks: readonly AudioMetadataTrack[],
  currentTimeSeconds: number
) => {
  if (!tracks.length) return -1;

  const currentIndex = tracks.findLastIndex(
    (track) => currentTimeSeconds >= track.startSeconds
  );

  return currentIndex === -1 ? 0 : currentIndex;
};

export const getTrackNavigationState = ({
  currentTimeSeconds,
  pendingTimeSeconds,
  tracks,
}: {
  currentTimeSeconds: number;
  pendingTimeSeconds?: number | null;
  tracks: readonly AudioMetadataTrack[];
}): AudioTrackNavigationState => {
  const currentIndex = getCurrentTrackIndex(tracks, currentTimeSeconds);
  const currentTrack = tracks[currentIndex];

  const pendingIndex =
    pendingTimeSeconds == null
      ? -1
      : getCurrentTrackIndex(tracks, pendingTimeSeconds);

  const isNearCurrentTrackStart =
    !!currentTrack &&
    currentTimeSeconds - currentTrack.startSeconds <=
      TRACK_START_THRESHOLD_SECONDS;

  const previousIndex =
    isNearCurrentTrackStart && currentIndex > 0
      ? currentIndex - 1
      : currentIndex;

  return {
    canSeekNext: currentIndex >= 0 && currentIndex < tracks.length - 1,
    canSeekPrevious:
      currentIndex > 0 || (!!currentTrack && !isNearCurrentTrackStart),
    currentIndex,
    currentTrack,
    isNearCurrentTrackStart,
    nextIndex: currentIndex >= 0 ? currentIndex + 1 : -1,
    pendingIndex,
    previousIndex,
  };
};
