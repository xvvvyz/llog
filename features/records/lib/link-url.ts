const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:/i;
const EMAIL_ADDRESS = /^[^\s@/]+@[^\s@/]+\.[^\s@/]+$/;

const ALLOWED_PROTOCOLS = new Set([
  'http:',
  'https:',
  'mailto:',
  'sms:',
  'tel:',
]);

const serializeLinkUrl = (url: URL) => {
  const serialized = url.toString();

  if (
    (url.protocol === 'http:' || url.protocol === 'https:') &&
    url.pathname === '/'
  ) {
    return serialized.replace(/\/(?=[?#]|$)/, '');
  }

  return serialized;
};

export const normalizeLinkUrl = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const normalized = HAS_SCHEME.test(trimmed)
    ? trimmed
    : EMAIL_ADDRESS.test(trimmed)
      ? `mailto:${trimmed}`
      : `https://${trimmed}`;

  try {
    const url = new URL(normalized);

    if (!ALLOWED_PROTOCOLS.has(url.protocol) || /\s/.test(normalized)) {
      return null;
    }

    const hasTarget =
      url.protocol === 'http:' || url.protocol === 'https:'
        ? !!url.hostname
        : !!url.pathname;

    if (!hasTarget) return null;
    return serializeLinkUrl(url);
  } catch {
    return null;
  }
};

export const getLinkUrlDisplayText = (url: string) => {
  try {
    const parsed = new URL(url);
    return parsed.hostname || url;
  } catch {
    return url;
  }
};
