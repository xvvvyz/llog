const parseUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
};

export const normalizePublicOrigin = (request: Request, appUrl?: string) => {
  const publicUrl = appUrl ? parseUrl(appUrl) : null;
  if (!publicUrl) return request;
  const requestUrl = new URL(request.url);
  if (requestUrl.origin === publicUrl.origin) return request;
  requestUrl.protocol = publicUrl.protocol;
  requestUrl.hostname = publicUrl.hostname;
  requestUrl.port = publicUrl.port;
  return new Request(requestUrl, request);
};
