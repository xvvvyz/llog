export const SOURCE_MUSIC_LINK_PROVIDER = 'audd';

export type MusicLink = { provider: string; url: string };

export const PUBLIC_MUSIC_LINK_PROVIDERS = [
  'applemusic',
  'spotify',
  'tidal',
  'youtube',
] as const;

export const VISIBLE_MUSIC_LINK_PROVIDERS = [
  'spotify',
  'applemusic',
  'youtube',
  'tidal',
] as const;

const visibleMusicLinkProviders: readonly string[] =
  VISIBLE_MUSIC_LINK_PROVIDERS;

const MUSIC_LINK_PROVIDER_LABELS: Record<string, string> = {
  audd: 'AudD',
  applemusic: 'Apple Music',
  spotify: 'Spotify',
  tidal: 'Tidal',
  youtube: 'YouTube',
};

const publicMusicLinkProviderSet = new Set<string>(PUBLIC_MUSIC_LINK_PROVIDERS);

const visibleMusicLinkProviderSet = new Set<string>(
  VISIBLE_MUSIC_LINK_PROVIDERS
);

export const isSourceMusicLinkProvider = (provider: string) =>
  provider === SOURCE_MUSIC_LINK_PROVIDER;

export const isPublicMusicLinkProvider = (provider: string) =>
  publicMusicLinkProviderSet.has(provider);

export const isVisibleMusicLinkProvider = (provider: string) =>
  visibleMusicLinkProviderSet.has(provider);

export const getVisibleMusicLinkProviderOrder = (provider: string) => {
  const index = visibleMusicLinkProviders.indexOf(provider);
  return index === -1 ? visibleMusicLinkProviders.length : index;
};

export const getMusicLinkProviderLabel = (provider: string) => {
  const normalized = provider.trim().toLowerCase();

  if (MUSIC_LINK_PROVIDER_LABELS[normalized]) {
    return MUSIC_LINK_PROVIDER_LABELS[normalized];
  }

  if (!normalized) return 'Link';
  return `${normalized[0]?.toUpperCase() ?? ''}${normalized.slice(1)}`;
};

export const getPublicMusicLink = (url: URL): MusicLink | undefined => {
  const provider = getPublicMusicLinkProvider(url);
  if (!provider) return;
  const normalizedUrl = getNormalizedPublicMusicUrl(provider, url);
  return { provider, url: normalizedUrl.toString() };
};

const getPublicMusicLinkProvider = (url: URL) => {
  const hostname = url.hostname.toLowerCase().replace(/^www\./, '');

  if (hostname === 'open.spotify.com' && pathStartsWith(url, '/track/')) {
    return 'spotify';
  }

  if (hostname === 'music.apple.com' || hostname === 'itunes.apple.com') {
    return 'applemusic';
  }

  if (
    hostname === 'music.youtube.com' ||
    hostname === 'youtube.com' ||
    hostname === 'youtu.be'
  ) {
    return 'youtube';
  }

  if (
    hostnameMatches(hostname, 'tidal.com') &&
    (pathStartsWith(url, '/track/') || pathStartsWith(url, '/browse/track/'))
  ) {
    return 'tidal';
  }
};

const getNormalizedPublicMusicUrl = (provider: string, url: URL) => {
  const normalizedUrl = new URL(url);
  if (normalizedUrl.protocol === 'http:') normalizedUrl.protocol = 'https:';
  removeTrackingSearchParams(normalizedUrl);

  if (provider === 'applemusic') {
    for (const key of ['app', 'at', 'ct', 'ls', 'mt', 'uo']) {
      normalizedUrl.searchParams.delete(key);
    }
  }

  if (provider === 'spotify') normalizedUrl.searchParams.delete('si');
  return normalizedUrl;
};

const removeTrackingSearchParams = (url: URL) => {
  for (const key of [...url.searchParams.keys()]) {
    if (key.toLowerCase().startsWith('utm_')) url.searchParams.delete(key);
  }
};

const hostnameMatches = (hostname: string, target: string) =>
  hostname === target || hostname.endsWith(`.${target}`);

const pathStartsWith = (url: URL, path: string) =>
  url.pathname.toLowerCase().startsWith(path);
