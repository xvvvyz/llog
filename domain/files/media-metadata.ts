import { asId, asNumber, asString, isRecord } from '@/lib/coerce';
import { durationMsToSeconds } from '@/lib/duration';

export type NormalizedTrackLink = { provider: string; url: string };

export type NormalizedTrack = {
  album?: string;
  artists?: string[];
  artwork?: string;
  endSeconds?: number;
  genres?: string[];
  isrc?: string;
  label?: string;
  links?: NormalizedTrackLink[];
  releaseDate?: string;
  score?: number;
  startSeconds: number;
  title: string;
  trackDurationSeconds?: number;
  upc?: string;
};

export type NormalizedTranscriptSegment = {
  endSeconds: number;
  startSeconds: number;
  text: string;
};

export type MediaSearchItem = {
  endSeconds?: number;
  kind: 'track' | 'transcript';
  snippet: string;
  startSeconds?: number;
  text: string;
  trackDurationSeconds?: number;
};

const normalizeStrings = (value: unknown): string[] =>
  Array.isArray(value)
    ? value
        .map((item) => asString(item))
        .filter((item): item is string => !!item)
    : [];

const normalizeArtwork = (value: unknown) => {
  const url = asString(value);
  if (url) return url;
  if (!isRecord(value)) return;

  return (
    asString(value.small) ??
    asString(value.medium) ??
    asString(value.large) ??
    asString(value.original)
  );
};

export const normalizeTrackLinks = (value: unknown): NormalizedTrackLink[] => {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item): NormalizedTrackLink[] => {
    if (!isRecord(item)) return [];
    const provider = asString(item.provider)?.toLowerCase();
    const url = asString(item.url);
    if (!provider || !url) return [];
    return [{ provider, url }];
  });
};

const optionalDurationMsToSeconds = (value: unknown) => {
  const duration = asNumber(value);
  return duration == null ? undefined : durationMsToSeconds(duration);
};

export const parseStoredTracks = (value: unknown): NormalizedTrack[] => {
  if (!Array.isArray(value)) return [];

  return value
    .flatMap((item): NormalizedTrack[] => {
      if (!isRecord(item)) return [];
      const title = asString(item.title);
      const startSeconds = optionalDurationMsToSeconds(item.start);
      if (!title || startSeconds == null) return [];
      const album = asString(item.album);
      const artwork = normalizeArtwork(item.artwork);
      const endSeconds = optionalDurationMsToSeconds(item.end);
      const isrc = asId(item.isrc);
      const label = asString(item.label);
      const releaseDate = asString(item.releaseDate);
      const score = asNumber(item.score);

      const trackDurationSeconds = optionalDurationMsToSeconds(
        item.trackDuration
      );

      const upc = asId(item.upc);
      if (endSeconds != null && endSeconds < startSeconds) return [];
      const artists = normalizeStrings(item.artists);
      const genres = normalizeStrings(item.genres);
      const links = normalizeTrackLinks(item.links);

      return [
        {
          ...(album ? { album } : {}),
          ...(artists.length ? { artists } : {}),
          ...(artwork ? { artwork } : {}),
          ...(endSeconds != null ? { endSeconds } : {}),
          ...(genres.length ? { genres } : {}),
          ...(isrc ? { isrc } : {}),
          ...(label ? { label } : {}),
          ...(links.length ? { links } : {}),
          ...(releaseDate ? { releaseDate } : {}),
          ...(score != null ? { score } : {}),
          startSeconds,
          title,
          ...(trackDurationSeconds != null ? { trackDurationSeconds } : {}),
          ...(upc ? { upc } : {}),
        },
      ];
    })
    .sort((a, b) => a.startSeconds - b.startSeconds);
};

export const parseStoredTranscriptSegments = (
  value: unknown
): NormalizedTranscriptSegment[] => {
  if (!Array.isArray(value)) return [];

  return value
    .flatMap((item): NormalizedTranscriptSegment[] => {
      if (!isRecord(item)) return [];
      const start = asNumber(item.start);
      const end = asNumber(item.end);
      const text = asString(item.text);

      if (start == null || end == null || !text || start < 0 || end < start) {
        return [];
      }

      return [{ endSeconds: end, startSeconds: start, text }];
    })
    .sort((a, b) => a.startSeconds - b.startSeconds);
};

export const getTrackArtistText = (track: Pick<NormalizedTrack, 'artists'>) =>
  track.artists?.length ? track.artists.join(', ') : '';

export const getTrackSearchSnippet = (track: NormalizedTrack) => {
  const artistText = getTrackArtistText(track);
  return artistText ? `${track.title} - ${artistText}` : track.title;
};

export const getTrackSearchText = (track: NormalizedTrack) =>
  [getTrackSearchSnippet(track), track.album].filter(Boolean).join(' ');

export const getTranscriptSearchSnippet = (
  segment: NormalizedTranscriptSegment
) => segment.text;

export const getMediaSearchItems = ({
  tracks,
  transcript,
}: {
  tracks?: unknown;
  transcript?: unknown;
}): MediaSearchItem[] => [
  ...parseStoredTracks(tracks).map((track) => ({
    ...(track.endSeconds != null ? { endSeconds: track.endSeconds } : {}),
    kind: 'track' as const,
    snippet: getTrackSearchSnippet(track),
    startSeconds: track.startSeconds,
    text: getTrackSearchText(track),
    ...(track.trackDurationSeconds != null
      ? { trackDurationSeconds: track.trackDurationSeconds }
      : {}),
  })),
  ...parseStoredTranscriptSegments(transcript).map((segment) => ({
    endSeconds: segment.endSeconds,
    kind: 'transcript' as const,
    snippet: getTranscriptSearchSnippet(segment),
    startSeconds: segment.startSeconds,
    text: getTranscriptSearchSnippet(segment),
  })),
];

export const getMediaSearchText = (items: readonly MediaSearchItem[]) =>
  items.map((item) => item.text).join(' ');
