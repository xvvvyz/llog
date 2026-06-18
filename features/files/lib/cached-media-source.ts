const getSourceUrl = (src?: string | null) => {
  if (!src) return null;

  try {
    return new URL(
      src,
      typeof window !== 'undefined' ? window.location.origin : undefined
    );
  } catch {
    return null;
  }
};

const isImageDeliveryHost = (hostname: string) =>
  hostname === 'imagedelivery.net' || hostname.endsWith('.imagedelivery.net');

const isCloudflareStreamHost = (hostname: string) =>
  hostname === 'cloudflarestream.com' ||
  hostname.endsWith('.cloudflarestream.com') ||
  hostname === 'videodelivery.net' ||
  hostname.endsWith('.videodelivery.net');

const imageVariantScore = (variant: string) => {
  const params = new Map(
    variant.split(',').flatMap((part) => {
      const [key, value] = part.split('=', 2);
      return key && value ? [[key, value] as const] : [];
    })
  );

  const width = Number(params.get('w'));
  const height = Number(params.get('h'));
  const safeWidth = Number.isFinite(width) && width > 0 ? width : 0;
  const safeHeight = Number.isFinite(height) && height > 0 ? height : 0;
  // Score by max linear dimension, not area, so single-dimension requests
  // (e.g. w=512) stay comparable to two-dimension ones (e.g. w=128,h=128).
  // Otherwise a tiny 128×128 thumbnail (area 16384) outranks a 512-wide one.
  return Math.max(safeWidth, safeHeight);
};

const getImageDeliveryCacheKey = (url: URL) => {
  const parts = url.pathname.split('/').filter(Boolean);
  let variantIndex: number;

  if (isImageDeliveryHost(url.hostname)) {
    variantIndex = 2;
  } else if (parts[0] === 'cdn-cgi' && parts[1] === 'imagedelivery') {
    variantIndex = 4;
  } else {
    return null;
  }

  if (parts.length <= variantIndex) return null;

  return {
    key: `${url.origin}/${parts.slice(0, variantIndex).join('/')}`,
    score: imageVariantScore(parts[variantIndex] ?? ''),
  };
};

const getStreamThumbnailCacheKey = (url: URL) => {
  if (
    !isCloudflareStreamHost(url.hostname) ||
    !/\/thumbnails\/thumbnail\.(?:jpe?g|png|webp|gif)$/i.test(url.pathname)
  ) {
    return null;
  }

  const params = new URLSearchParams(url.search);
  const width = Number(params.get('width'));
  const height = Number(params.get('height'));
  params.delete('width');
  params.delete('height');
  params.sort();
  const safeWidth = Number.isFinite(width) && width > 0 ? width : 0;
  const safeHeight = Number.isFinite(height) && height > 0 ? height : 0;

  return {
    key: `${url.origin}${url.pathname}?${params.toString()}`,
    // Max linear dimension keeps width-only and width+height variants
    // comparable; see imageVariantScore.
    score: Math.max(safeWidth, safeHeight),
  };
};

const getImageCacheKey = (src: string) => {
  const url = getSourceUrl(src);
  if (!url) return null;
  return getImageDeliveryCacheKey(url) ?? getStreamThumbnailCacheKey(url);
};

const normalizeSourceUrl = (src: string) => getSourceUrl(src)?.href ?? src;

export const findLargestCachedImageSource = (
  src: string,
  cachedSources: readonly string[]
) => {
  const requested = getImageCacheKey(src);
  const normalizedSrc = normalizeSourceUrl(src);
  let best: { score: number; src: string } | null = null;

  for (const cachedSource of cachedSources) {
    const normalizedCachedSource = normalizeSourceUrl(cachedSource);

    if (normalizedCachedSource === normalizedSrc) {
      best ??= { score: requested?.score ?? 0, src: cachedSource };
    }

    if (!requested) continue;
    const candidate = getImageCacheKey(cachedSource);
    if (!candidate || candidate.key !== requested.key) continue;
    // Only reuse a cached variant that's at least as large as what we asked
    // for. Falling back to a smaller cached variant swaps the freshly rendered
    // sharp image for a blurry, upscaled one.
    if (candidate.score < requested.score) continue;
    if (best && candidate.score <= best.score) continue;
    best = { score: candidate.score, src: cachedSource };
  }

  return best?.src ?? null;
};
