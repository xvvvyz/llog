self.__LLOG_SW_VERSION__ = 'offline-v1';
const CACHE_NAME = `llog-${self.__LLOG_SW_VERSION__}`;
const INSTALL_CACHE_NAME = `${CACHE_NAME}-install`;
const CACHE_RESOURCES_MESSAGE = 'LLOG_CACHE_RESOURCES';
const EXPO_ASSET_PREFIX = '/_expo/';
const INDEX_URL = '/index.html';
const APP_SHELL_URLS = ['/', INDEX_URL];
const CACHE_VERSION_PATTERN = /^llog-offline-v(\d+)$/;

const HTML_RESOURCE_ATTRIBUTE_PATTERN =
  /\b(?:src|href)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^'"\s>]+))/gi;

const EXPO_RESOURCE_PATTERN = /\/_expo\/[^"'`\s)<>\\]+/g;
const TEXT_RESOURCE_PATTERN = /\.(?:css|html|js|json|webmanifest)(?:[?#]|$)/;
const IMAGE_RESPONSE_PATTERN = /^image\//i;
const MEDIA_RESPONSE_PATTERN = /^(?:audio|video)\//i;
const MEDIA_REQUEST_DESTINATIONS = new Set(['audio', 'video']);

const STATIC_RESOURCE_URLS = [
  '/manifest.webmanifest',
  '/favicon.ico',
  '/favicon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-192-maskable.png',
  '/icon-512-maskable.png',
  '/apple-touch-icon-152.png',
  '/apple-touch-icon-167.png',
  '/apple-touch-icon-180.png',
  '/apple-touch-icon.png',
  '/badge-72.png',
];

const BLOCKED_ROUTE_PREFIXES = ['/api', '/mcp', '/.well-known', '/cdn-cgi'];

// Image resources are cacheable outside the app shell, including a tight
// allowlist of cross-origin Cloudflare image hosts.
const SAME_ORIGIN_IMAGE_PATH_PATTERNS = [
  /^\/api\/v1\/files\/avatars\/(?:gradient|neutral)$/,
  /^\/api\/v1\/files\/[^/]+\/track-artwork$/,
  /^\/api\/v1\/files\/(?:profiles|records|replies|teams)\//,
  /^\/cdn-cgi\/imagedelivery\//,
];

const toUrl = (value) => {
  try {
    return new URL(value, self.location.origin);
  } catch {
    return null;
  }
};

const toSameOriginUrl = (value) => {
  const url = toUrl(value);
  if (!url || url.origin !== self.location.origin) return null;
  return url;
};

const toCacheablePath = (value) => {
  const url = toSameOriginUrl(value);
  if (!url || !isCacheableResource(url)) return null;
  return `${url.pathname}${url.search}`;
};

const toCacheableImageUrl = (value) => {
  const url = toUrl(value);
  if (!url || !isCacheableImageResource(url)) return null;

  return url.origin === self.location.origin
    ? `${url.pathname}${url.search}`
    : url.href;
};

const hasFileExtension = (pathname) => {
  const basename = pathname.split('/').pop() ?? '';
  return basename.includes('.');
};

const isBlockedRoute = (pathname) =>
  BLOCKED_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

const isAppRoute = (pathname) =>
  !pathname.startsWith(EXPO_ASSET_PREFIX) &&
  !isBlockedRoute(pathname) &&
  !hasFileExtension(pathname);

const toNotificationUrl = (value) => {
  const url = toSameOriginUrl(value ?? '/');

  return url && isAppRoute(url.pathname)
    ? url.href
    : new URL('/', self.location.origin).href;
};

const isCacheableResource = (url) =>
  url.origin === self.location.origin &&
  (url.pathname.startsWith(EXPO_ASSET_PREFIX) ||
    APP_SHELL_URLS.includes(url.pathname) ||
    STATIC_RESOURCE_URLS.includes(url.pathname));

const isImageDeliveryHost = (hostname) =>
  hostname === 'imagedelivery.net' || hostname.endsWith('.imagedelivery.net');

const isCloudflareStreamHost = (hostname) =>
  hostname === 'cloudflarestream.com' ||
  hostname.endsWith('.cloudflarestream.com') ||
  hostname === 'videodelivery.net' ||
  hostname.endsWith('.videodelivery.net');

const isCloudflareImageResource = (url) =>
  isImageDeliveryHost(url.hostname) &&
  url.pathname.split('/').filter(Boolean).length >= 3;

const isCloudflareStreamThumbnailResource = (url) =>
  isCloudflareStreamHost(url.hostname) &&
  /\/thumbnails\/thumbnail\.(?:jpe?g|png|webp|gif)$/i.test(url.pathname);

const isSameOriginImageResource = (url) =>
  url.origin === self.location.origin &&
  SAME_ORIGIN_IMAGE_PATH_PATTERNS.some((pattern) => pattern.test(url.pathname));

const isExternalImageResource = (url) =>
  url.origin !== self.location.origin &&
  (isCloudflareImageResource(url) || isCloudflareStreamThumbnailResource(url));

const isCacheableImageResource = (url) =>
  isSameOriginImageResource(url) || isExternalImageResource(url);

const isCacheableExternalImageRequest = (request, url) =>
  request.destination === 'image' && isExternalImageResource(url);

const isImageResponse = (response) =>
  IMAGE_RESPONSE_PATTERN.test(response.headers.get('content-type') ?? '');

const isMediaRequest = (request) =>
  MEDIA_REQUEST_DESTINATIONS.has(request.destination);

const isMediaResponse = (response) =>
  MEDIA_RESPONSE_PATTERN.test(response.headers.get('content-type') ?? '');

const isCacheableImageResponse = (response) =>
  response.type === 'opaque' ||
  (response.ok &&
    response.status !== 206 &&
    !isMediaResponse(response) &&
    isImageResponse(response));

const unique = (values) => [...new Set(values)];

const cacheVersion = (name) => {
  const match = CACHE_VERSION_PATTERN.exec(name);
  return match ? Number(match[1]) : Number.NEGATIVE_INFINITY;
};

const previousCacheNames = (cacheNames) =>
  cacheNames
    .filter((name) => CACHE_VERSION_PATTERN.test(name) && name !== CACHE_NAME)
    .sort((left, right) => cacheVersion(right) - cacheVersion(left))
    .slice(0, 1);

const responseHeaders = (response) => {
  const headers = new Headers(response.headers);
  headers.delete('content-encoding');
  headers.delete('content-length');
  return headers;
};

const withoutRedirects = (response) =>
  new Response(response.clone().body, {
    headers: responseHeaders(response),
    status: response.status,
    statusText: response.statusText,
  });

const matchCurrentCache = async (request) => {
  const cache = await caches.open(CACHE_NAME);
  return (await cache.match(request)) ?? caches.match(request);
};

const matchCurrentAppShell = async () => {
  const cache = await caches.open(CACHE_NAME);

  const response =
    (await cache.match(INDEX_URL)) ??
    (await cache.match('/')) ??
    (await caches.match(INDEX_URL)) ??
    (await caches.match('/'));

  return response ? withoutRedirects(response) : undefined;
};

const fetchResource = async (path, { reload = true } = {}) => {
  const response = reload
    ? await fetch(path, { cache: 'reload' })
    : await fetch(path);

  if (!response.ok) throw new Error(`Failed to cache ${path}.`);
  return response;
};

const cachePath = async (
  cache,
  path,
  { onlyIfMissing = false, reload = true, required }
) => {
  try {
    if (onlyIfMissing && (await cache.match(path))) return;
    const response = await fetchResource(path, { reload });

    const cacheResponse = APP_SHELL_URLS.includes(path)
      ? withoutRedirects(response)
      : response.clone();

    await cache.put(path, cacheResponse);
  } catch (error) {
    if (required) throw error;
  }
};

const copyCache = async (sourceName, targetName) => {
  const source = await caches.open(sourceName);
  const target = await caches.open(targetName);
  const requests = await source.keys();

  await Promise.all(
    requests.map(async (request) => {
      const response = await source.match(request);
      if (response) await target.put(request, response);
    })
  );
};

const cacheUrls = async (urls, cacheName = CACHE_NAME) => {
  const cache = await caches.open(cacheName);
  const paths = unique(urls.map(toCacheablePath).filter(Boolean));
  const imageUrls = unique(urls.map(toCacheableImageUrl).filter(Boolean));

  await Promise.allSettled([
    ...paths.map((path) => cachePath(cache, path, { required: false })),
    ...imageUrls.map((url) => cacheImageUrl(cache, url, { required: false })),
  ]);
};

const fetchImageResource = (url, { reload = true } = {}) => {
  const parsed = new URL(url, self.location.origin);

  if (isExternalImageResource(parsed)) {
    return fetch(
      new Request(parsed.href, {
        cache: reload ? 'reload' : 'default',
        mode: 'no-cors',
      })
    );
  }

  return fetchResource(url, { reload });
};

const cacheImageUrl = async (
  cache,
  url,
  { onlyIfMissing = false, reload = true, required }
) => {
  try {
    if (onlyIfMissing && (await cache.match(url))) return;
    const response = await fetchImageResource(url, { reload });

    if (isCacheableImageResponse(response)) {
      await cache.put(url, response.clone());
    }
  } catch (error) {
    if (required) throw error;
  }
};

const extractCacheableResourcePaths = (html) => {
  const paths = new Set();
  HTML_RESOURCE_ATTRIBUTE_PATTERN.lastIndex = 0;

  for (;;) {
    const match = HTML_RESOURCE_ATTRIBUTE_PATTERN.exec(html);
    if (!match) break;
    const path = toCacheablePath(match[1] ?? match[2] ?? match[3]);
    if (path) paths.add(path);
  }

  return [...paths];
};

const extractExpoResourcePaths = (text) => {
  const paths = new Set();
  EXPO_RESOURCE_PATTERN.lastIndex = 0;

  for (;;) {
    const match = EXPO_RESOURCE_PATTERN.exec(text);
    if (!match) break;
    const path = toCacheablePath(match[0]);
    if (path?.startsWith(EXPO_ASSET_PREFIX)) paths.add(path);
  }

  return [...paths];
};

const appResourcePaths = (html) =>
  extractCacheableResourcePaths(html).filter((path) =>
    path.startsWith(EXPO_ASSET_PREFIX)
  );

const isTextResourcePath = (path) => TEXT_RESOURCE_PATTERN.test(path);

const cacheAppResources = async (
  cache,
  initialPaths,
  { onlyIfMissing = false, reloadResources = true, required }
) => {
  const seen = new Set();
  const queue = unique(initialPaths);

  for (let index = 0; index < queue.length; index += 1) {
    const path = queue[index];
    if (seen.has(path)) continue;
    seen.add(path);

    try {
      if (onlyIfMissing && (await cache.match(path))) continue;
      const response = await fetchResource(path, { reload: reloadResources });
      await cache.put(path, response.clone());

      if (isTextResourcePath(path)) {
        for (const nestedPath of extractExpoResourcePaths(
          await response.clone().text()
        )) {
          if (!seen.has(nestedPath)) queue.push(nestedPath);
        }
      }
    } catch (error) {
      if (required) throw error;
    }
  }
};

const cacheAppShellResponse = async (
  cache,
  response,
  { onlyIfMissing = false, reloadResources = true, required }
) => {
  const appShellResponse = withoutRedirects(response);
  const html = await appShellResponse.clone().text();
  const paths = appResourcePaths(html);

  if (required && paths.length === 0) {
    throw new Error(`No app resources found in ${INDEX_URL}.`);
  }

  await cacheAppResources(cache, paths, {
    onlyIfMissing,
    reloadResources,
    required,
  });

  await cache.put(INDEX_URL, appShellResponse.clone());
  await cache.put('/', appShellResponse.clone());
};

const cacheCurrentAppShell = async () => {
  await caches.delete(INSTALL_CACHE_NAME);

  try {
    const cache = await caches.open(INSTALL_CACHE_NAME);
    const response = await fetchResource(INDEX_URL);
    await cacheAppShellResponse(cache, response, { required: true });
    await cacheUrls(STATIC_RESOURCE_URLS, INSTALL_CACHE_NAME);
    await copyCache(INSTALL_CACHE_NAME, CACHE_NAME);
  } catch (error) {
    await caches.delete(INSTALL_CACHE_NAME);
    throw error;
  }

  await caches.delete(INSTALL_CACHE_NAME);
};

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      await cacheCurrentAppShell();
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();

      const retainedCacheNames = new Set([
        CACHE_NAME,
        ...previousCacheNames(cacheNames),
      ]);

      await Promise.all(
        cacheNames
          .filter(
            (name) => name.startsWith('llog-') && !retainedCacheNames.has(name)
          )
          .map((name) => caches.delete(name))
      );

      await self.clients.claim();
    })()
  );
});

const networkFirstNavigation = async (request) => {
  try {
    const response = await fetch(request);
    if (!response.ok) throw new Error('Navigation request failed.');
    const cache = await caches.open(CACHE_NAME);
    const appShellResponse = withoutRedirects(response);

    await cacheAppShellResponse(cache, appShellResponse.clone(), {
      onlyIfMissing: true,
      reloadResources: false,
      required: true,
    });

    return appShellResponse;
  } catch {
    return (await matchCurrentAppShell()) ?? Response.error();
  }
};

const cacheFirstResource = async (request) => {
  const cached = await matchCurrentCache(request);
  if (cached) return cached;
  const response = await fetch(request);

  if (response.ok) {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, response.clone());
  }

  return response;
};

// Image responses use cache-first so already-viewed avatars, artwork, and
// attachments remain available offline.
const cacheFirstImage = async (request) => {
  if (request.headers.has('Range')) return fetch(request);
  const cached = await matchCurrentCache(request);
  if (cached && isCacheableImageResponse(cached)) return cached;
  const response = await fetch(request);

  if (isCacheableImageResponse(response)) {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, response.clone());
  }

  return response;
};

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  if (isMediaRequest(request)) return;
  const url = new URL(request.url);

  if (isCacheableExternalImageRequest(request, url)) {
    event.respondWith(cacheFirstImage(request));
    return;
  }

  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate' && isAppRoute(url.pathname)) {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  if (isSameOriginImageResource(url)) {
    event.respondWith(cacheFirstImage(request));
    return;
  }

  if (isCacheableResource(url)) event.respondWith(cacheFirstResource(request));
});

self.addEventListener('message', (event) => {
  if (event.data?.type !== CACHE_RESOURCES_MESSAGE) return;
  event.waitUntil(cacheUrls(event.data.urls ?? []));
});

self.addEventListener('push', (event) => {
  if (!event.data) return;
  let payload = {};

  try {
    payload = event.data.json();
  } catch {
    return;
  }

  event.waitUntil(
    self.registration.showNotification(payload.title ?? 'llog', {
      badge: '/badge-72.png',
      body: payload.body ?? '',
      data: {
        recordId: payload.recordId,
        type: payload.type,
        url: payload.url ?? '/',
      },
      icon: '/icon-192.png',
      tag: payload.tag,
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = toNotificationUrl(event.notification.data?.url);

  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({
        includeUncontrolled: true,
        type: 'window',
      });

      const [client] = clients;

      if (client) {
        if ('focus' in client) await client.focus();
        if ('navigate' in client) await client.navigate(url);
        return;
      }

      if (self.clients.openWindow) await self.clients.openWindow(url);
    })()
  );
});
