import { getAcrCloudMetadataTrack } from '@/api/audio-analysis/acrcloud-client';
import type * as audioAnalysisTypes from '@/api/audio-analysis/types';
import { asId, asNumber, asString, isRecord } from '@/lib/coerce';
import { durationSecondsToMs } from '@/lib/duration';

const getMusicSegments = (results: unknown) => {
  const parsed =
    typeof results === 'string' ? (JSON.parse(results) as unknown) : results;

  return isRecord(parsed) && Array.isArray(parsed.music) ? parsed.music : [];
};

export const getMusicTracks = async (results: unknown, env: CloudflareEnv) => {
  const tracks = getMusicSegments(results)
    .map(getMusicTrack)
    .filter((track): track is audioAnalysisTypes.MusicTrack => !!track);

  return Promise.all(tracks.map((track) => enrichMusicTrack(env, track)));
};

const getMusicTrack = (
  value: unknown
): audioAnalysisTypes.MusicTrack | undefined => {
  if (!isRecord(value) || !isRecord(value.result)) return;
  const result = value.result;
  const title = asString(result.title);
  if (!title) return;

  const start =
    asNumber(result.sample_begin_time_offset_ms) ??
    durationSecondsToMs(asNumber(value.offset)) ??
    0;

  const playedDuration = durationSecondsToMs(asNumber(value.played_duration));

  const end =
    asNumber(result.sample_end_time_offset_ms) ??
    (playedDuration === undefined ? undefined : start + playedDuration) ??
    start;

  const externalIds = isRecord(result.external_ids)
    ? result.external_ids
    : undefined;

  const album = isRecord(result.album) ? result.album : undefined;
  const externalArtists = getExternalArtistNames(result.external_metadata);

  const artists = externalArtists.length
    ? externalArtists
    : getNames(result.artists);

  const genres = getNames(result.genres);
  const links = getMusicLinks(result.external_metadata);

  const track: audioAnalysisTypes.MusicTrack = {
    artists,
    end,
    score: asNumber(result.score) ?? 0,
    start,
    title,
  };

  const albumName = asId(album?.name);
  if (albumName) track.album = albumName;
  const label = asId(result.label);
  if (label) track.label = label;
  const releaseDate = asId(result.release_date);
  if (releaseDate) track.releaseDate = releaseDate;
  const acrid = asId(result.acrid);
  if (acrid) track.acrid = acrid;
  const isrc = asId(externalIds?.isrc);
  if (isrc) track.isrc = isrc;
  const upc = asId(externalIds?.upc);
  if (upc) track.upc = upc;
  const trackDuration = asNumber(result.duration_ms);
  if (trackDuration !== undefined) track.trackDuration = trackDuration;
  if (genres.length) track.genres = genres;
  if (links.length) track.links = links;
  return track;
};

const enrichMusicTrack = async (
  env: CloudflareEnv,
  track: audioAnalysisTypes.MusicTrack
) => {
  try {
    const metadata = await getAcrCloudMetadataTrack(env, track);
    return metadata ? mergeMusicTrackMetadata(track, metadata) : track;
  } catch (error) {
    console.error('ACRCloud metadata lookup failed', {
      acrid: track.acrid,
      error,
      isrc: track.isrc,
      title: track.title,
    });

    return track;
  }
};

const mergeMusicTrackMetadata = (
  track: audioAnalysisTypes.MusicTrack,
  metadata: Record<string, unknown>
) => {
  const album = isRecord(metadata.album) ? metadata.album : undefined;
  const artists = getNames(metadata.artists);
  const genres = getNames(metadata.genres);

  const links = mergeMusicLinks(
    track.links ?? [],
    getMusicLinks(metadata.external_metadata)
  );

  const artwork = getArtwork(metadata);
  const next: audioAnalysisTypes.MusicTrack = { ...track };
  const title = asId(metadata.name);
  if (title) next.title = title;
  if (artists.length) next.artists = artists;
  const albumName = asId(album?.name);
  if (albumName) next.album = albumName;
  const label = asId(album?.label);
  if (label) next.label = label;
  const releaseDate = asId(metadata.release_date);
  if (releaseDate) next.releaseDate = releaseDate;

  if (!next.releaseDate) {
    const albumReleaseDate = asId(album?.release_date);
    if (albumReleaseDate) next.releaseDate = albumReleaseDate;
  }

  const isrc = asId(metadata.isrc);
  if (isrc) next.isrc = isrc;
  const upc = asId(album?.upc);
  if (upc) next.upc = upc;
  const trackDuration = asNumber(metadata.duration_ms);
  if (trackDuration !== undefined) next.trackDuration = trackDuration;
  if (genres.length) next.genres = genres;
  if (artwork) next.artwork = artwork;
  if (links.length) next.links = links;
  return next;
};

const getArtwork = (
  metadata: Record<string, unknown>
): audioAnalysisTypes.MusicTrackArtwork | undefined => {
  const album = isRecord(metadata.album) ? metadata.album : undefined;
  const covers = isRecord(album?.covers) ? album.covers : undefined;
  const artwork: audioAnalysisTypes.MusicTrackArtwork = {};
  const original = asId(album?.cover);
  if (original) artwork.original = original;
  const small = asId(covers?.small);
  if (small) artwork.small = small;
  const medium = asId(covers?.medium);
  if (medium) artwork.medium = medium;
  const large = asId(covers?.large);
  if (large) artwork.large = large;
  return Object.keys(artwork).length ? artwork : undefined;
};

const getExternalArtistNames = (externalMetadata: unknown) => {
  if (!isRecord(externalMetadata)) return [];

  for (const provider of ['spotify', 'deezer', 'applemusic', 'apple']) {
    const names = getProviderEntries(externalMetadata[provider]).flatMap(
      (entry) => getNames(entry.artists)
    );

    if (names.length) return names;
  }

  return Object.values(externalMetadata).flatMap((value) =>
    getProviderEntries(value).flatMap((entry) => getNames(entry.artists))
  );
};

const getMusicLinks = (externalMetadata: unknown) => {
  if (!isRecord(externalMetadata)) return [];

  return mergeMusicLinks(
    ...Object.entries(externalMetadata).map(([provider, value]) =>
      getProviderEntries(value)
        .map((entry) => getMusicLink(provider, entry))
        .filter((link): link is audioAnalysisTypes.MusicTrackLink => !!link)
    )
  );
};

const getMusicLink = (
  provider: string,
  entry: Record<string, unknown>
): audioAnalysisTypes.MusicTrackLink | undefined => {
  const album = isRecord(entry.album) ? entry.album : undefined;
  const track = isRecord(entry.track) ? entry.track : undefined;
  const trackId = asId(entry.id) ?? asId(track?.id) ?? asId(entry.vid);
  const albumId = asId(album?.id);
  const url = asString(entry.link) ?? getProviderTrackUrl(provider, trackId);
  if (!url) return;
  const link: audioAnalysisTypes.MusicTrackLink = { provider, url };
  if (trackId) link.trackId = trackId;
  if (albumId) link.albumId = albumId;
  return link;
};

const getProviderTrackUrl = (provider: string, trackId?: string) => {
  if (!trackId) return;

  switch (provider.toLowerCase()) {
    case 'deezer': {
      return `https://www.deezer.com/track/${encodeURIComponent(trackId)}`;
    }

    case 'spotify': {
      return `https://open.spotify.com/track/${encodeURIComponent(trackId)}`;
    }

    case 'youtube': {
      const url = new URL('https://music.youtube.com/watch');
      url.searchParams.set('v', trackId);
      return url.toString();
    }

    default: {
      return;
    }
  }
};

const getProviderEntries = (value: unknown) => {
  if (Array.isArray(value)) return value.filter(isRecord);
  return isRecord(value) ? [value] : [];
};

const getNames = (value: unknown) => {
  const names = Array.isArray(value)
    ? value.flatMap((item) => {
        if (isRecord(item)) return splitName(item.name);
        return splitName(item);
      })
    : [];

  return uniqueStrings(names);
};

const splitName = (value: unknown) =>
  (asString(value) ?? '')
    .split(';')
    .map((item) => item.trim())
    .filter(Boolean);

const mergeMusicLinks = (...groups: audioAnalysisTypes.MusicTrackLink[][]) => {
  const seen = new Set<string>();
  const links: audioAnalysisTypes.MusicTrackLink[] = [];

  for (const link of groups.flat()) {
    const key = `${link.provider}:${link.url}`;
    if (seen.has(key)) continue;
    seen.add(key);
    links.push(link);
  }

  return links;
};

const uniqueStrings = (values: string[]) => {
  const seen = new Set<string>();
  const unique: string[] = [];

  for (const value of values) {
    const key = value.toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(value);
  }

  return unique;
};
