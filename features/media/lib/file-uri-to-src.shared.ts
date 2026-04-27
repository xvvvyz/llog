export type ResolvedFileUrl = string | null;

export type FileUriToSrcOptions = {
  quality?: number;
  targetHeight?: number;
  targetSize?: number;
  targetWidth?: number;
};

const DEFAULT_CLOUDFLARE_IMAGE_QUALITY = 75;
const DEFAULT_CLOUDFLARE_IMAGE_FORMAT = 'webp';
const CLOUDFLARE_STREAM_THUMBNAIL_MIN_SIZE = 10;
const CLOUDFLARE_STREAM_THUMBNAIL_MAX_SIZE = 2000;
const isAbsoluteUri = (uri: string) => /^[a-z][a-z\d+.-]*:/i.test(uri);

const roundPositiveDimension = (value?: number) =>
  value != null && Number.isFinite(value) && value > 0
    ? Math.round(value)
    : null;

const getTargetDimensions = (options?: FileUriToSrcOptions) => {
  const targetSize = roundPositiveDimension(options?.targetSize);

  return {
    targetHeight: roundPositiveDimension(options?.targetHeight) ?? targetSize,
    targetWidth: roundPositiveDimension(options?.targetWidth) ?? targetSize,
  };
};

const isCloudflareStreamThumbnailUrl = (url: URL) =>
  (url.hostname.endsWith('cloudflarestream.com') ||
    url.hostname.endsWith('videodelivery.net')) &&
  /\/thumbnails\/thumbnail\.(?:jpe?g|png|webp|gif)$/i.test(url.pathname);

const clampCloudflareStreamThumbnailDimension = (value?: number | null) => {
  if (value == null) return null;

  return Math.min(
    Math.max(value, CLOUDFLARE_STREAM_THUMBNAIL_MIN_SIZE),
    CLOUDFLARE_STREAM_THUMBNAIL_MAX_SIZE
  );
};

const getCloudflareStreamThumbnailDimensions = (
  options?: FileUriToSrcOptions
) => {
  const dimensions = getTargetDimensions(options);

  const targetWidth = clampCloudflareStreamThumbnailDimension(
    dimensions.targetWidth
  );

  const targetHeight = clampCloudflareStreamThumbnailDimension(
    dimensions.targetHeight
  );

  return {
    targetHeight:
      targetHeight != null && targetHeight % 2 === 1
        ? targetHeight - 1
        : targetHeight,
    targetWidth,
  };
};

const getCloudflareFlexibleVariantSrc = (
  url: URL,
  options?: FileUriToSrcOptions
) => {
  const parts = url.pathname.split('/').filter(Boolean);
  let variantIndex: number;

  if (url.hostname.endsWith('imagedelivery.net')) {
    variantIndex = 2;
  } else if (parts[0] === 'cdn-cgi' && parts[1] === 'imagedelivery') {
    variantIndex = 4;
  } else {
    return null;
  }

  if (parts.length <= variantIndex) return null;
  const quality = options?.quality ?? DEFAULT_CLOUDFLARE_IMAGE_QUALITY;
  const { targetHeight, targetWidth } = getTargetDimensions(options);
  const variant = [`format=${DEFAULT_CLOUDFLARE_IMAGE_FORMAT}`, `q=${quality}`];
  if (targetWidth != null) variant.push(`w=${targetWidth}`);
  if (targetHeight != null) variant.push(`h=${targetHeight}`);
  parts[variantIndex] = variant.join(',');
  url.pathname = `/${parts.join('/')}`;
  return url.toString();
};

const getCloudflareStreamThumbnailSrc = (
  url: URL,
  options?: FileUriToSrcOptions
) => {
  if (!isCloudflareStreamThumbnailUrl(url)) return null;

  const { targetHeight, targetWidth } =
    getCloudflareStreamThumbnailDimensions(options);

  if (targetWidth == null && targetHeight == null) return null;
  if (targetWidth != null) url.searchParams.set('width', String(targetWidth));

  if (targetHeight != null) {
    url.searchParams.set('height', String(targetHeight));
  }

  return url.toString();
};

export const fileUriToSrc = (
  uri?: string | null,
  options?: FileUriToSrcOptions
): ResolvedFileUrl => {
  if (!uri) return null;

  if (isAbsoluteUri(uri)) {
    let url: URL;

    try {
      url = new URL(uri);
    } catch {
      return uri;
    }

    return (
      getCloudflareFlexibleVariantSrc(url, options) ??
      getCloudflareStreamThumbnailSrc(url, options) ??
      uri
    );
  }

  return `${process.env.EXPO_PUBLIC_API_URL}/files/${uri}`;
};

export const useFileUriToSrc = (
  uri?: string | null,
  options?: FileUriToSrcOptions
) => fileUriToSrc(uri, options);
