import * as auddParams from '@/api/audio-analysis/audd-params';
import { enrichMusicTracks } from '@/api/audio-analysis/track-metadata';
import type * as audioAnalysisTypes from '@/api/audio-analysis/types';
import { asId, asNumber, asString, isRecord } from '@/lib/coerce';

const MAX_RUN_GAP_MS = auddParams.AUDD_SCAN_INTERVAL_MS + 15000;
const MIN_RUN_CHUNKS = 2;
const SHORT_AUDIO_MAX_DURATION_MS = 5 * 60 * 1000;
const MIN_SINGLE_DETECTION_DURATION_MS = 6000;
const MIN_SINGLE_DETECTION_SCORE = 80;
const VARIANT_OVERLAP_RATIO = 0.35;
const ALTERNATIVE_OVERLAP_RATIO = 0.8;
const ALTERNATIVE_START_THRESHOLD_MS = 15000;

const MAX_ADJACENT_REPEAT_GAP_MS = Math.min(
  45000,
  auddParams.AUDD_SCAN_INTERVAL_MS * 3 + 5000
);

type AuddDetection = {
  album?: string;
  artists: string[];
  chunkStart: number;
  end: number;
  isrc?: string;
  label?: string;
  link?: string;
  releaseDate?: string;
  score?: number;
  start: number;
  title: string;
  upc?: string;
};

type TrackCandidate = audioAnalysisTypes.MusicTrack & {
  chunkCount: number;
  coverageScore: number;
  detections: AuddDetection[];
  familyKey: string;
  identityKeys: string[];
};

type AuddTrackOptions = { audioDurationMs?: number | null };

export const getAuddMusicTracks = async (
  results: unknown,
  options: AuddTrackOptions = {}
) => enrichMusicTracks(getAuddTrackCandidates(results, options));

const getAuddTrackCandidates = (
  results: unknown,
  options: AuddTrackOptions
) => {
  const detections = getAuddDetections(results).sort(
    (a, b) => a.start - b.start
  );

  const runsByIdentity = new Map<string, AuddDetection[][]>();

  for (const detection of detections) {
    const identity = getIdentityKey(detection);
    const runs = runsByIdentity.get(identity) ?? [];
    const lastRun = runs.at(-1);
    const lastEnd = lastRun ? getDetectionRunEnd(lastRun) : undefined;

    if (
      !lastRun ||
      lastEnd === undefined ||
      detection.start - lastEnd > MAX_RUN_GAP_MS
    ) {
      runs.push([detection]);
      runsByIdentity.set(identity, runs);
    } else {
      lastRun.push(detection);
    }
  }

  const candidates = [...runsByIdentity.values()]
    .flat()
    .map((detections) =>
      getTrackCandidate(detections, {
        allowSingleDetection: isShortAudio(options.audioDurationMs),
      })
    )
    .filter((track): track is TrackCandidate => !!track)
    .sort((a, b) => a.start - b.start);

  return mergeAdjacentRepeatedTracks(
    pruneOverlappingAlternatives(mergeTrackVariants(candidates))
  ).map(stripCandidateFields);
};

const getAuddDetections = (results: unknown) => {
  if (!Array.isArray(results)) return [];

  return results.flatMap((chunk) => {
    if (!isRecord(chunk)) return [];
    const chunkStart = parseTimecodeMs(chunk.offset) ?? 0;
    if (!Array.isArray(chunk.songs)) return [];

    return chunk.songs
      .map((song) => getAuddDetection(song, chunkStart))
      .filter((track): track is AuddDetection => !!track);
  });
};

const getAuddDetection = (
  value: unknown,
  chunkStart: number
): AuddDetection | undefined => {
  if (!isRecord(value)) return;
  const title = asString(value.title);
  if (!title) return;
  const localStart = asNumber(value.start_offset) ?? 0;

  const localEnd =
    asNumber(value.end_offset) ?? auddParams.AUDD_CHUNK_DURATION_MS;

  const start = chunkStart + Math.max(0, localStart);
  const end = chunkStart + Math.max(localStart, localEnd);
  const artists = getArtists(value.artist);
  const score = normalizeScore(value.score);

  const detection: AuddDetection = {
    artists: artists.length ? artists : ['Unknown artist'],
    chunkStart,
    end,
    ...(score != null ? { score } : {}),
    start,
    title,
  };

  const album = asString(value.album);
  if (album) detection.album = album;
  const label = asString(value.label);
  if (label) detection.label = label;
  const releaseDate = asString(value.release_date);
  if (releaseDate) detection.releaseDate = releaseDate;
  const isrc = asId(value.isrc);
  if (isrc) detection.isrc = isrc;
  const upc = asId(value.upc);
  if (upc) detection.upc = upc;
  const link = asString(value.song_link);
  if (link) detection.link = link;
  return detection;
};

const getTrackCandidate = (
  detections: AuddDetection[],
  { allowSingleDetection = false }: { allowSingleDetection?: boolean } = {}
): TrackCandidate | undefined => {
  const chunkCount = new Set(detections.map((item) => item.chunkStart)).size;
  const start = Math.min(...detections.map((item) => item.start));
  const end = Math.max(...detections.map((item) => item.end));
  const duration = end - start;

  const hasCredibleSingleDetection =
    duration >= MIN_SINGLE_DETECTION_DURATION_MS &&
    detections.some((item) => !!item.link) &&
    detections.some(
      (item) => item.score != null && item.score >= MIN_SINGLE_DETECTION_SCORE
    );

  const canUseSingleDetection =
    allowSingleDetection && duration >= MIN_SINGLE_DETECTION_DURATION_MS;

  if (
    chunkCount < MIN_RUN_CHUNKS &&
    !canUseSingleDetection &&
    !hasCredibleSingleDetection
  ) {
    return;
  }

  const title = mostCommon(detections.map((item) => item.title));
  if (!title) return;

  const artists = mostCommonArray(detections.map((item) => item.artists)) ?? [
    'Unknown artist',
  ];

  const coverageScore = getCoverageScore({ chunkCount, end, start });

  const track: TrackCandidate = {
    artists,
    chunkCount,
    coverageScore,
    detections,
    end,
    familyKey: getFamilyKey({ artists, title }),
    identityKeys: uniqueStrings(detections.map(getIdentityKey)),
    score: getConfidenceScore(detections) ?? coverageScore,
    start,
    title,
  };

  const album = mostCommon(detections.map((item) => item.album));
  if (album) track.album = album;
  const label = mostCommon(detections.map((item) => item.label));
  if (label) track.label = label;
  const releaseDate = mostCommon(detections.map((item) => item.releaseDate));
  if (releaseDate) track.releaseDate = releaseDate;
  const isrc = mostCommon(detections.map((item) => item.isrc));
  if (isrc) track.isrc = isrc;
  const upc = mostCommon(detections.map((item) => item.upc));
  if (upc) track.upc = upc;
  const link = mostCommon(detections.map((item) => item.link));
  if (link) track.links = [{ provider: 'audd', url: link }];
  return track;
};

const mergeTrackVariants = (tracks: TrackCandidate[]) => {
  const merged: TrackCandidate[] = [];

  for (const track of tracks) {
    const targetIndex = merged.findIndex(
      (candidate) =>
        candidate.familyKey === track.familyKey &&
        getOverlapRatio(candidate, track) >= VARIANT_OVERLAP_RATIO
    );

    if (targetIndex === -1) {
      merged.push(track);
      continue;
    }

    const next = getTrackCandidate(
      [...merged[targetIndex].detections, ...track.detections],
      { allowSingleDetection: true }
    );

    if (next) merged[targetIndex] = next;
  }

  return merged.sort((a, b) => a.start - b.start);
};

const pruneOverlappingAlternatives = (tracks: TrackCandidate[]) => {
  const pruned: TrackCandidate[] = [];

  for (const track of tracks) {
    const targetIndex = pruned.findIndex((candidate) =>
      isOverlappingAlternative(candidate, track)
    );

    if (targetIndex === -1) {
      pruned.push(track);
      continue;
    }

    if (compareTrackQuality(track, pruned[targetIndex]) > 0) {
      pruned[targetIndex] = track;
    }
  }

  return pruned.sort((a, b) => a.start - b.start);
};

const mergeAdjacentRepeatedTracks = (tracks: TrackCandidate[]) => {
  const merged: TrackCandidate[] = [];

  for (const track of tracks) {
    const previous = merged.at(-1);

    if (!previous || !isAdjacentRepeat(previous, track)) {
      merged.push(track);
      continue;
    }

    const next = getTrackCandidate(
      [...previous.detections, ...track.detections],
      { allowSingleDetection: true }
    );

    if (next) merged[merged.length - 1] = next;
    else merged.push(track);
  }

  return merged.sort((a, b) => a.start - b.start);
};

const stripCandidateFields = ({
  chunkCount: _chunkCount,
  coverageScore: _coverageScore,
  detections: _detections,
  familyKey: _familyKey,
  identityKeys: _identityKeys,
  ...track
}: TrackCandidate): audioAnalysisTypes.MusicTrack => track;

const getDetectionRunEnd = (detections: AuddDetection[]) =>
  Math.max(...detections.map((item) => item.end));

const getCoverageScore = ({
  chunkCount,
  end,
  start,
}: {
  chunkCount: number;
  end: number;
  start: number;
}) => {
  const expectedChunks = Math.max(
    1,
    Math.ceil((end - start) / auddParams.AUDD_SCAN_INTERVAL_MS)
  );

  return Math.min(100, Math.round((chunkCount / expectedChunks) * 100));
};

const getConfidenceScore = (detections: AuddDetection[]) => {
  const scores = detections
    .map((item) => item.score)
    .filter((score): score is number => score != null);

  if (!scores.length) return;

  return Math.round(
    scores.reduce((total, score) => total + score, 0) / scores.length
  );
};

const getOverlapRatio = (
  first: audioAnalysisTypes.MusicTrack,
  second: audioAnalysisTypes.MusicTrack
) => {
  const overlap = Math.max(
    0,
    Math.min(first.end, second.end) - Math.max(first.start, second.start)
  );

  const shortest = Math.max(
    1,
    Math.min(first.end - first.start, second.end - second.start)
  );

  return overlap / shortest;
};

const isOverlappingAlternative = (
  first: audioAnalysisTypes.MusicTrack,
  second: audioAnalysisTypes.MusicTrack
) =>
  Math.abs(first.start - second.start) <= ALTERNATIVE_START_THRESHOLD_MS &&
  getOverlapRatio(first, second) >= ALTERNATIVE_OVERLAP_RATIO;

const isAdjacentRepeat = (first: TrackCandidate, second: TrackCandidate) => {
  const gap = second.start - first.end;

  return (
    gap >= 0 &&
    gap <= MAX_ADJACENT_REPEAT_GAP_MS &&
    hasSharedStableIdentity(first, second)
  );
};

const hasSharedStableIdentity = (
  first: TrackCandidate,
  second: TrackCandidate
) => {
  const firstKeys = new Set(
    first.identityKeys.filter((key) => isStableIdentityKey(key))
  );

  return second.identityKeys.some(
    (key) => isStableIdentityKey(key) && firstKeys.has(key)
  );
};

const isStableIdentityKey = (key: string) =>
  key.startsWith('isrc:') || key.startsWith('upc:') || key.startsWith('link:');

const compareTrackQuality = (first: TrackCandidate, second: TrackCandidate) => {
  const scoreDelta = first.score - second.score;
  if (scoreDelta !== 0) return scoreDelta;
  const coverageDelta = first.coverageScore - second.coverageScore;
  if (coverageDelta !== 0) return coverageDelta;
  const chunkDelta = first.chunkCount - second.chunkCount;
  if (chunkDelta !== 0) return chunkDelta;
  return first.end - first.start - (second.end - second.start);
};

const getIdentityKey = (detection: AuddDetection) =>
  getStableIdKey('isrc', detection.isrc) ??
  getStableIdKey('upc', detection.upc) ??
  getStableIdKey('link', detection.link) ??
  [
    getFamilyKey(detection),
    normalizeText(detection.artists.slice(1).join(' ')),
  ].join(':');

const getStableIdKey = (prefix: string, value?: string) => {
  const normalized = value?.trim().toLowerCase();
  return normalized ? `${prefix}:${normalized}` : undefined;
};

const getFamilyKey = ({
  artists,
  title,
}: Pick<AuddDetection, 'artists' | 'title'>) =>
  [normalizeText(artists[0]), normalizeTitle(title)].join(':');

const normalizeTitle = (value: string) =>
  normalizeText(value.replace(/\([^)]*\)|\[[^\]]*\]/g, ''));

const normalizeText = (value: string) =>
  value
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const getArtists = (value: unknown) =>
  uniqueStrings(
    (asString(value) ?? '')
      .split(/;|\s+\/\s+/)
      .map((item) => item.trim())
      .filter(Boolean)
  );

const parseTimecodeMs = (value: unknown) => {
  const numeric = asNumber(value);
  if (numeric !== undefined) return Math.round(numeric * 1000);
  const text = asString(value);
  if (!text) return;
  const parts = text.split(':').map((part) => Number(part));
  if (!parts.length || parts.some((part) => !Number.isFinite(part))) return;
  return parts.reduce((total, part) => total * 60 + part, 0) * 1000;
};

const normalizeScore = (value: unknown) => {
  const score = asNumber(value);
  if (score === undefined) return;
  return Math.max(0, Math.min(100, Math.round(score)));
};

const isShortAudio = (durationMs?: number | null) =>
  typeof durationMs === 'number' &&
  Number.isFinite(durationMs) &&
  durationMs <= SHORT_AUDIO_MAX_DURATION_MS;

const mostCommon = (values: Array<string | undefined>) => {
  const counts = new Map<string, number>();

  for (const value of values) {
    if (!value) continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
};

const mostCommonArray = (values: string[][]) => {
  const counts = new Map<string, { count: number; value: string[] }>();

  for (const value of values) {
    const key = JSON.stringify(value);
    const current = counts.get(key);
    counts.set(key, { count: (current?.count ?? 0) + 1, value });
  }

  return [...counts.values()].sort((a, b) => b.count - a.count)[0]?.value;
};

const uniqueStrings = (items: string[]) => {
  const seen = new Set<string>();
  const unique: string[] = [];

  for (const item of items) {
    const key = item.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(item);
  }

  return unique;
};
