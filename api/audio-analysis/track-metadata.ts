import type * as audioAnalysisTypes from '@/api/audio-analysis/types';
import { asString } from '@/lib/coerce';
import * as musicLinks from '@/lib/music-links';

type TrackMetadata = {
  artwork?: string;
  links: audioAnalysisTypes.MusicTrackLink[];
};

const LISTENTO_HOSTS = new Set(['lis.tn', 'www.lis.tn']);

const HTML_ENTITIES: Record<string, string> = {
  amp: '&',
  apos: "'",
  gt: '>',
  lt: '<',
  quot: '"',
};

export const enrichMusicTracks = async (
  tracks: audioAnalysisTypes.MusicTrack[]
) => {
  const metadataBySongLink = new Map<string, Promise<TrackMetadata | null>>();

  return Promise.all(
    tracks.map((track) => enrichMusicTrack(track, metadataBySongLink))
  );
};

const enrichMusicTrack = async (
  track: audioAnalysisTypes.MusicTrack,
  metadataBySongLink: Map<string, Promise<TrackMetadata | null>>
) => {
  const songLink = getSongLink(track);
  if (!songLink) return track;

  try {
    const metadata = await getCachedTrackMetadata(songLink, metadataBySongLink);
    if (!metadata) return track;
    return mergeTrackMetadata(track, metadata);
  } catch (error) {
    console.error('AudD song link metadata lookup failed', {
      error,
      songLink,
      title: track.title,
    });

    return track;
  }
};

const getCachedTrackMetadata = (
  songLink: string,
  metadataBySongLink: Map<string, Promise<TrackMetadata | null>>
) => {
  const cached = metadataBySongLink.get(songLink);
  if (cached) return cached;
  const metadata = getTrackMetadata(songLink);
  metadataBySongLink.set(songLink, metadata);
  return metadata;
};

const getTrackMetadata = async (
  songLink: string
): Promise<TrackMetadata | null> => {
  const sourceUrl = getHttpUrl(songLink);
  if (!sourceUrl) return null;
  const sourceLink = musicLinks.getPublicMusicLink(sourceUrl);

  if (!LISTENTO_HOSTS.has(sourceUrl.hostname.toLowerCase())) {
    return sourceLink ? { links: [sourceLink] } : null;
  }

  const response = await fetch(sourceUrl, { headers: { Accept: 'text/html' } });

  if (!response.ok) {
    throw new Error(
      `AudD song link metadata failed: ${JSON.stringify({
        status: response.status,
        statusText: response.statusText,
        url: sourceUrl.toString(),
      })}`
    );
  }

  return parseListentoTrackMetadata(await response.text(), sourceUrl);
};

const parseListentoTrackMetadata = (
  html: string,
  sourceUrl: URL
): TrackMetadata | null => {
  const links = getListentoMusicLinks(html);
  const artworkUrl = getListentoArtworkUrl(html, sourceUrl);
  const artwork = artworkUrl?.toString();
  if (!links.length && !artwork) return null;
  return { ...(artwork ? { artwork } : {}), links };
};

const getSongLink = (track: audioAnalysisTypes.MusicTrack) => {
  const sourceLink = track.links?.find((link) =>
    musicLinks.isSourceMusicLinkProvider(link.provider)
  );

  return sourceLink?.url;
};

const mergeTrackMetadata = (
  track: audioAnalysisTypes.MusicTrack,
  metadata: TrackMetadata
) => {
  const links = mergeMusicLinks(track.links ?? [], metadata.links);

  return {
    ...track,
    ...(metadata.artwork ? { artwork: metadata.artwork } : {}),
    ...(links.length ? { links } : {}),
  };
};

const getListentoArtworkUrl = (html: string, sourceUrl: URL) => {
  for (const tag of html.matchAll(/<meta\b[^>]*>/gi)) {
    const property = getHtmlAttribute(tag[0], 'property')?.toLowerCase();
    const name = getHtmlAttribute(tag[0], 'name')?.toLowerCase();
    if (property !== 'og:image' && name !== 'twitter:image') continue;
    const content = getHtmlAttribute(tag[0], 'content');
    const artworkUrl = getHttpUrl(content, sourceUrl);
    if (artworkUrl) return artworkUrl.toString();
  }
};

const getListentoMusicLinks = (html: string) => {
  const links: audioAnalysisTypes.MusicTrackLink[] = [];

  for (const tag of html.matchAll(/<a\b[^>]*\bhref\s*=[^>]*>/gi)) {
    const href = getHtmlAttribute(tag[0], 'href');
    const url = getHttpUrl(href);
    const link = url ? musicLinks.getPublicMusicLink(url) : undefined;
    if (link) links.push(link);
  }

  return mergeMusicLinks(links);
};

const getHttpUrl = (value: unknown, base?: URL) => {
  const text = decodeHtmlEntities(asString(value) ?? '').trim();
  if (!text) return;

  try {
    const url = new URL(text.startsWith('//') ? `https:${text}` : text, base);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
    return url;
  } catch {
    return;
  }
};

const getHtmlAttribute = (html: string, attribute: string) => {
  for (const match of html.matchAll(
    /([^\s"'<>/=]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g
  )) {
    if (match[1]?.toLowerCase() !== attribute.toLowerCase()) continue;
    return decodeHtmlEntities(match[2] ?? match[3] ?? match[4] ?? '');
  }
};

const decodeHtmlEntities = (value: string) =>
  value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, entity: string) => {
    const normalized = entity.toLowerCase();

    if (normalized.startsWith('#x')) {
      const codePoint = Number.parseInt(normalized.slice(2), 16);

      return isValidCodePoint(codePoint)
        ? String.fromCodePoint(codePoint)
        : match;
    }

    if (normalized.startsWith('#')) {
      const codePoint = Number.parseInt(normalized.slice(1), 10);

      return isValidCodePoint(codePoint)
        ? String.fromCodePoint(codePoint)
        : match;
    }

    return HTML_ENTITIES[normalized] ?? match;
  });

const isValidCodePoint = (value: number) =>
  Number.isInteger(value) && value >= 0 && value <= 0x10ffff;

const mergeMusicLinks = (...groups: audioAnalysisTypes.MusicTrackLink[][]) => {
  const providers = new Set<string>();
  const urls = new Set<string>();
  const links: audioAnalysisTypes.MusicTrackLink[] = [];

  for (const link of groups.flat()) {
    const provider = link.provider.trim().toLowerCase();
    const url = link.url.trim();

    if (
      !provider ||
      !url ||
      (!musicLinks.isSourceMusicLinkProvider(provider) &&
        !musicLinks.isPublicMusicLinkProvider(provider)) ||
      providers.has(provider) ||
      urls.has(url)
    ) {
      continue;
    }

    providers.add(provider);
    urls.add(url);
    links.push({ ...link, provider, url });
  }

  return links;
};
