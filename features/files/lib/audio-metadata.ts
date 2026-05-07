import { asNumber, asString, isRecord } from '@/lib/coerce';
import { durationMsToSeconds } from '@/lib/duration';
import * as musicLinks from '@/lib/music-links';

export type AudioTrackLink = { provider: string; url: string };

export type AudioMetadataTrack = {
  album?: string;
  artistText: string;
  artwork?: string;
  links: AudioTrackLink[];
  startSeconds: number;
  title: string;
};

export type AudioTranscriptSegment = {
  endSeconds: number;
  startSeconds: number;
  text: string;
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

export type AudioTranscriptNavigationState = {
  currentIndex: number;
  pendingIndex: number;
};

const UNKNOWN_ARTIST = 'Unknown artist';

export const TRACK_START_THRESHOLD_SECONDS = 2;

const LOCK_SCREEN_ARTWORK_SIZE = 512;
type ParseAudioTracksOptions = { fileId?: string | null };

const getTrackArtworkProxyUri = ({
  artworkSource,
  fileId,
}: {
  artworkSource: string;
  fileId?: string | null;
}) => {
  if (!fileId || !process.env.EXPO_PUBLIC_API_URL) return;

  return `${process.env.EXPO_PUBLIC_API_URL}/files/${encodeURIComponent(
    fileId
  )}/track-artwork?source=${encodeURIComponent(artworkSource)}`;
};

const getArtwork = (
  value: unknown,
  options: { fileId?: string | null }
): string | undefined => {
  const url = asString(value);

  if (url) {
    return (
      getTrackArtworkProxyUri({ artworkSource: url, fileId: options.fileId }) ??
      url
    );
  }

  if (!isRecord(value)) return;

  const legacyUrl =
    asString(value.small) ??
    asString(value.medium) ??
    asString(value.large) ??
    asString(value.original);

  return legacyUrl
    ? (getTrackArtworkProxyUri({
        artworkSource: legacyUrl,
        fileId: options.fileId,
      }) ?? legacyUrl)
    : undefined;
};

const getArtistText = (value: unknown) => {
  const artists = Array.isArray(value)
    ? value
        .map((artist) => asString(artist))
        .filter((artist): artist is string => !!artist)
    : [];

  return artists.length ? artists.join(', ') : UNKNOWN_ARTIST;
};

const getTrackLinks = (value: unknown): AudioTrackLink[] => {
  if (!Array.isArray(value)) return [];
  const linksByProvider = new Map<string, AudioTrackLink>();
  let sourceLink: AudioTrackLink | undefined;

  for (const item of value) {
    if (!isRecord(item)) continue;
    const provider = asString(item.provider)?.trim().toLowerCase();
    const url = asString(item.url);
    if (!provider || !url) continue;

    if (musicLinks.isSourceMusicLinkProvider(provider)) {
      sourceLink ??= { provider, url };
      continue;
    }

    if (!musicLinks.isVisibleMusicLinkProvider(provider)) continue;
    if (linksByProvider.has(provider)) continue;
    linksByProvider.set(provider, { provider, url });
  }

  const visibleLinks = [...linksByProvider.values()].sort(
    (a, b) =>
      musicLinks.getVisibleMusicLinkProviderOrder(a.provider) -
      musicLinks.getVisibleMusicLinkProviderOrder(b.provider)
  );

  return visibleLinks.length ? visibleLinks : sourceLink ? [sourceLink] : [];
};

export const getTrackArtworkUri = (track: AudioMetadataTrack) => track.artwork;

export const getTrackMediaSessionArtwork = (
  track: AudioMetadataTrack
): AudioMediaSessionArtwork[] | undefined => {
  const artwork = track.artwork;
  if (!artwork) return;

  return [
    {
      sizes: `${LOCK_SCREEN_ARTWORK_SIZE}x${LOCK_SCREEN_ARTWORK_SIZE}`,
      src: artwork,
    },
  ];
};

export const getTrackMediaSessionMetadata = (
  track: AudioMetadataTrack
): AudioMediaSessionMetadata => ({
  ...(track.album ? { album: track.album } : {}),
  artist: track.artistText,
  artwork: getTrackMediaSessionArtwork(track),
  title: track.title,
});

export const parseAudioTracks = (
  value: unknown,
  options: ParseAudioTracksOptions = {}
): AudioMetadataTrack[] => {
  if (!Array.isArray(value)) return [];

  return value
    .flatMap((item) => {
      if (!isRecord(item)) return [];
      const title = asString(item.title);
      const start = asNumber(item.start);
      const album = asString(item.album);
      if (!title || start == null) return [];

      return [
        {
          ...(album ? { album } : {}),
          artistText: getArtistText(item.artists),
          artwork: getArtwork(item.artwork, { fileId: options.fileId }),
          links: getTrackLinks(item.links),
          startSeconds: durationMsToSeconds(start) ?? 0,
          title,
        },
      ];
    })
    .sort((a, b) => a.startSeconds - b.startSeconds);
};

export const parseTranscriptSegments = (
  value: unknown
): AudioTranscriptSegment[] => {
  if (!Array.isArray(value)) return [];

  return value
    .flatMap((item): AudioTranscriptSegment[] => {
      if (!isRecord(item)) return [];
      const start = asNumber(item.start);
      const end = asNumber(item.end);
      const text = asString(item.text);
      if (start == null || end == null || !text || end < start) return [];
      return [{ endSeconds: end, startSeconds: start, text }];
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

export const getCurrentTranscriptSegmentIndex = (
  segments: readonly AudioTranscriptSegment[],
  currentTimeSeconds: number
) => {
  if (!segments.length) return -1;

  const currentIndex = segments.findLastIndex(
    (segment) => currentTimeSeconds >= segment.startSeconds
  );

  return currentIndex === -1 ? 0 : currentIndex;
};

export const getTranscriptNavigationState = ({
  currentTimeSeconds,
  pendingTimeSeconds,
  segments,
}: {
  currentTimeSeconds: number;
  pendingTimeSeconds?: number | null;
  segments: readonly AudioTranscriptSegment[];
}): AudioTranscriptNavigationState => {
  const currentIndex = getCurrentTranscriptSegmentIndex(
    segments,
    currentTimeSeconds
  );

  return {
    currentIndex,
    pendingIndex:
      pendingTimeSeconds == null
        ? -1
        : getCurrentTranscriptSegmentIndex(segments, pendingTimeSeconds),
  };
};
