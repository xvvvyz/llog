export type ResolvedFileUrl = string | null;

export type FileUriToSrcOptions = {
  quality?: number;
  targetHeight?: number;
  targetWidth?: number;
};

const DEFAULT_CLOUDFLARE_IMAGE_QUALITY = 75;

const isAbsoluteUri = (uri: string) => /^[a-z][a-z\d+.-]*:/i.test(uri);

const roundPositiveDimension = (value?: number) =>
  value != null && Number.isFinite(value) && value > 0
    ? Math.round(value)
    : null;

const getCloudflareFlexibleVariantSrc = (
  uri: string,
  options?: FileUriToSrcOptions
) => {
  let url: URL;

  try {
    url = new URL(uri);
  } catch {
    return uri;
  }

  const parts = url.pathname.split('/').filter(Boolean);
  let variantIndex: number;

  if (url.hostname.endsWith('imagedelivery.net')) {
    variantIndex = 2;
  } else if (parts[0] === 'cdn-cgi' && parts[1] === 'imagedelivery') {
    variantIndex = 4;
  } else {
    return uri;
  }

  if (parts.length <= variantIndex) {
    return uri;
  }

  const quality = options?.quality ?? DEFAULT_CLOUDFLARE_IMAGE_QUALITY;
  const targetWidth = roundPositiveDimension(options?.targetWidth);
  const targetHeight = roundPositiveDimension(options?.targetHeight);
  const variant = [`q=${quality}`];

  if (targetWidth != null) {
    variant.push(`w=${targetWidth}`);
  }

  if (targetHeight != null) {
    variant.push(`h=${targetHeight}`);
  }

  parts[variantIndex] = variant.join(',');
  url.pathname = `/${parts.join('/')}`;

  return url.toString();
};

export const fileUriToSrc = (
  uri?: string | null,
  options?: FileUriToSrcOptions
): ResolvedFileUrl => {
  if (!uri) return null;

  if (isAbsoluteUri(uri)) {
    return getCloudflareFlexibleVariantSrc(uri, options);
  }

  return `${process.env.EXPO_PUBLIC_API_URL}/files/${uri}`;
};

export const useFileUriToSrc = (
  uri?: string | null,
  options?: FileUriToSrcOptions
) => fileUriToSrc(uri, options);
