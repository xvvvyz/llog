import { readFileSync } from 'node:fs';
import { fileURLToPath, URL as NodeURL } from 'node:url';
import { describe, expect, test } from 'bun:test';

const origin = 'https://llog.test';

const source = readFileSync(
  fileURLToPath(new NodeURL('../../public/sw.js', import.meta.url)),
  'utf8'
);

type WorkerEvent = {
  data?: { type?: string; urls?: string[] };
  notification?: { close: () => void; data?: { url?: string } };
  request?: RequestLike;
  respondWith?: (response: Promise<Response> | Response) => void;
  waitUntil: (promise: Promise<unknown>) => void;
};

type WorkerListener = (event: WorkerEvent) => void;

type FakeWorker = {
  __LLOG_SW_VERSION__?: string;
  addEventListener: (type: string, listener: WorkerListener) => void;
  clients: {
    claim: () => Promise<void>;
    matchAll: () => Promise<never[]>;
    openWindow: (url: string) => Promise<null>;
  };
  location: { origin: string };
  registration: { showNotification: () => Promise<void> };
  skipWaiting: () => Promise<void>;
};

type FetchFixture =
  | string
  | {
      body?: string;
      headers?: Record<string, string>;
      redirected?: boolean;
      status?: number;
    };

type RequestLike =
  | RequestInfo
  | URL
  | {
      destination?: RequestDestination;
      headers?: Headers;
      method?: string;
      mode?: string;
      url: string;
    };

type Fetcher = (input: RequestLike, init?: RequestInit) => Promise<Response>;

const hasUrl = (input: unknown): input is { url: string } =>
  typeof input === 'object' &&
  input !== null &&
  'url' in input &&
  typeof input.url === 'string';

const swCacheKey = (input: RequestLike) => {
  const value = hasUrl(input)
    ? input.url
    : input instanceof URL
      ? input.href
      : input;

  const url = new URL(value, origin);
  const path = `${url.pathname}${url.search}`;
  return url.origin === origin ? path : url.href;
};

const redirectedResponse = (response: Response) => {
  const clone = response.clone.bind(response);

  Object.defineProperties(response, {
    clone: { value: () => redirectedResponse(clone()) },
    redirected: { value: true },
  });

  return response;
};

const fixtureResponse = (fixture?: FetchFixture) => {
  if (!fixture) return new Response('missing', { status: 404 });
  if (typeof fixture === 'string') return new Response(fixture);

  const response = new Response(fixture.body ?? '', {
    headers: fixture.headers,
    status: fixture.status ?? 200,
  });

  return fixture.redirected ? redirectedResponse(response) : response;
};

function createHarness(fixtures: Record<string, FetchFixture>) {
  const listeners = new Map<string, WorkerListener[]>();
  const stores = new Map<string, Map<string, Response>>();
  const fetchCalls: string[] = [];
  const openedUrls: string[] = [];
  let skipWaitingCalls = 0;

  const store = (name: string) => {
    const existing = stores.get(name);
    if (existing) return existing;
    const next = new Map<string, Response>();
    stores.set(name, next);
    return next;
  };

  const fakeCaches = {
    delete: async (name: string) => stores.delete(name),
    keys: async () => [...stores.keys()],
    match: async (request: RequestInfo | URL) => {
      const path = swCacheKey(request);

      for (const cache of stores.values()) {
        const response = cache.get(path);
        if (response) return response;
      }
    },
    open: async (name: string) =>
      ({
        keys: async () =>
          [...store(name).keys()].map(
            (path) =>
              new Request(path.startsWith('http') ? path : `${origin}${path}`)
          ),
        match: async (request: RequestInfo | URL) =>
          store(name).get(swCacheKey(request)),
        put: async (request: RequestInfo | URL, response: Response) => {
          store(name).set(swCacheKey(request), response);
        },
      }) as Partial<Cache> as Cache,
  };

  const fakeFetch: Fetcher = async (input) => {
    const path = swCacheKey(input);
    fetchCalls.push(path);
    return fixtureResponse(fixtures[path]);
  };

  const worker: FakeWorker = {
    addEventListener: (type, listener) => {
      listeners.set(type, [...(listeners.get(type) ?? []), listener]);
    },
    clients: {
      claim: async () => {},
      matchAll: async () => [],
      openWindow: async (url) => {
        openedUrls.push(url);
        return null;
      },
    },
    location: { origin },
    registration: { showNotification: async () => {} },
    skipWaiting: async () => {
      skipWaitingCalls += 1;
    },
  };

  const execute = new Function(
    'self',
    'caches',
    'fetch',
    'Response',
    'Request',
    'URL',
    source
  ) as (
    worker: FakeWorker,
    caches: CacheStorage,
    fetch: Fetcher,
    response: typeof Response,
    request: typeof Request,
    url: typeof URL
  ) => void;

  execute(
    worker,
    fakeCaches as unknown as CacheStorage,
    fakeFetch,
    Response,
    Request,
    URL
  );

  const run = async (
    type: string,
    data?: { type?: string; urls?: string[] }
  ) => {
    const promises: Promise<unknown>[] = [];

    for (const listener of listeners.get(type) ?? []) {
      listener({ data, waitUntil: (promise) => promises.push(promise) });
    }

    await Promise.all(promises);
  };

  const currentCachePaths = () => {
    const cacheName = `llog-${worker.__LLOG_SW_VERSION__}`;
    return [...(stores.get(cacheName)?.keys() ?? [])].sort();
  };

  const runFetch = async (
    path: string,
    options: {
      destination?: RequestDestination;
      headers?: HeadersInit;
      mode?: string;
    } = {}
  ) => {
    const promises: Promise<unknown>[] = [];
    const responses: Promise<Response>[] = [];
    const url = path.startsWith('http') ? path : `${origin}${path}`;

    for (const listener of listeners.get('fetch') ?? []) {
      listener({
        request: {
          destination: options.destination,
          headers: new Headers(options.headers),
          method: 'GET',
          mode: options.mode ?? 'navigate',
          url,
        },
        respondWith: (response) => responses.push(Promise.resolve(response)),
        waitUntil: (promise) => promises.push(promise),
      });
    }

    await Promise.all(promises);
    const [response] = responses;
    if (!response) throw new Error('Fetch was not handled.');
    return response;
  };

  const seedCache = (
    name: string,
    path: string,
    fixture: FetchFixture = ''
  ) => {
    store(name).set(path, fixtureResponse(fixture));
  };

  const runNotificationClick = async (url?: string) => {
    const promises: Promise<unknown>[] = [];

    for (const listener of listeners.get('notificationclick') ?? []) {
      listener({
        notification: { close: () => {}, data: { url } },
        waitUntil: (promise) => promises.push(promise),
      });
    }

    await Promise.all(promises);
  };

  return {
    cacheNames: () => [...stores.keys()].sort(),
    currentCachePaths,
    fetchCalls,
    openedUrls,
    run,
    runFetch,
    runNotificationClick,
    seedCache,
    skipWaitingCalls: () => skipWaitingCalls,
  };
}

describe('service worker', () => {
  test('installs current shell', async () => {
    const harness = createHarness({
      '/_expo/static/css/global.css': 'css',
      '/_expo/static/js/web/entry.js':
        'paths: { index: "/_expo/static/js/web/index.js" }',
      '/_expo/static/js/web/index.js': 'js',
      '/index.html': `
        <link href="/manifest.webmanifest" rel="manifest">
        <link href="/_expo/static/css/global.css" rel="stylesheet">
        <script src="/_expo/static/js/web/entry.js"></script>
        <script src="/api/private.js"></script>
        <script src="https://cdn.example.com/app.js"></script>
      `,
      '/manifest.webmanifest': '{}',
    });

    await harness.run('install');
    expect(harness.skipWaitingCalls()).toBe(1);

    expect(harness.currentCachePaths()).toEqual([
      '/',
      '/_expo/static/css/global.css',
      '/_expo/static/js/web/entry.js',
      '/_expo/static/js/web/index.js',
      '/index.html',
      '/manifest.webmanifest',
    ]);
  });

  test('rejects missing bundles', async () => {
    const harness = createHarness({
      '/index.html': '<script src="/_expo/static/js/web/entry.js"></script>',
    });

    await expect(harness.run('install')).rejects.toThrow(
      'Failed to cache /_expo/static/js/web/entry.js.'
    );

    expect(harness.skipWaitingCalls()).toBe(0);
    expect(harness.currentCachePaths()).toEqual([]);
  });

  test('rejects missing split bundles', async () => {
    const harness = createHarness({
      '/_expo/static/js/web/entry.js':
        'paths: { index: "/_expo/static/js/web/index.js" }',
      '/index.html': '<script src="/_expo/static/js/web/entry.js"></script>',
    });

    await expect(harness.run('install')).rejects.toThrow(
      'Failed to cache /_expo/static/js/web/index.js.'
    );

    expect(harness.skipWaitingCalls()).toBe(0);
    expect(harness.currentCachePaths()).toEqual([]);
  });

  test('keeps messages best effort', async () => {
    const harness = createHarness({ '/_expo/static/js/web/entry.js': 'js' });

    await harness.run('message', {
      type: 'LLOG_CACHE_RESOURCES',
      urls: [
        '/_expo/static/js/web/entry.js',
        '/_expo/static/js/web/missing.js',
      ],
    });

    expect(harness.currentCachePaths()).toEqual([
      '/_expo/static/js/web/entry.js',
    ]);
  });

  test('caches same-origin images', async () => {
    const path = '/api/v1/files/avatars/neutral?seed=abc';

    const harness = createHarness({
      [path]: { body: 'image', headers: { 'content-type': 'image/webp' } },
    });

    const response = await harness.runFetch(path, { mode: 'no-cors' });
    expect(await response.text()).toBe('image');
    expect(harness.currentCachePaths()).toEqual([path]);
    const cached = await harness.runFetch(path, { mode: 'no-cors' });
    expect(await cached.text()).toBe('image');
    expect(harness.fetchCalls).toEqual([path]);
  });

  test('caches external images', async () => {
    const url =
      'https://imagedelivery.net/account/image-id/format=webp,q=75,w=120,h=120';

    const harness = createHarness({
      [url]: { body: 'image', headers: { 'content-type': 'image/webp' } },
    });

    const response = await harness.runFetch(url, {
      destination: 'image',
      mode: 'no-cors',
    });

    expect(await response.text()).toBe('image');
    expect(harness.currentCachePaths()).toEqual([url]);

    const cached = await harness.runFetch(url, {
      destination: 'image',
      mode: 'no-cors',
    });

    expect(await cached.text()).toBe('image');
    expect(harness.fetchCalls).toEqual([url]);
  });

  test('ignores backend non-media', async () => {
    const path = '/api/v1/files/records/record-1/files/file-1';

    const harness = createHarness({
      [path]: { body: 'json', headers: { 'content-type': 'application/json' } },
    });

    const response = await harness.runFetch(path, { mode: 'no-cors' });
    expect(await response.text()).toBe('json');
    expect(harness.currentCachePaths()).toEqual([]);
  });

  test('bypasses image ranges', async () => {
    const path = '/api/v1/files/avatars/neutral?seed=abc';

    const harness = createHarness({
      [path]: { body: 'fresh', headers: { 'content-type': 'image/webp' } },
    });

    harness.seedCache('llog-offline-v1', path, {
      body: 'cached',
      headers: { 'content-type': 'image/webp' },
    });

    const response = await harness.runFetch(path, {
      headers: { Range: 'bytes=0-1' },
      mode: 'no-cors',
    });

    expect(await response.text()).toBe('fresh');
    expect(harness.fetchCalls).toEqual([path]);
  });

  test('caches message images', async () => {
    const imagePath =
      '/api/v1/files/abc/track-artwork?source=https%3A%2F%2Fimages.example%2Fcover.jpg';

    const externalImageUrl =
      'https://imagedelivery.net/account/image-id/public';

    const harness = createHarness({
      [externalImageUrl]: {
        body: 'external-image',
        headers: { 'content-type': 'image/webp' },
      },
      [imagePath]: { body: 'image', headers: { 'content-type': 'image/webp' } },
    });

    await harness.run('message', {
      type: 'LLOG_CACHE_RESOURCES',
      urls: [`${origin}${imagePath}`, externalImageUrl],
    });

    expect(harness.currentCachePaths()).toEqual([imagePath, externalImageUrl]);
  });

  test('keeps notification local', async () => {
    const harness = createHarness({});
    await harness.runNotificationClick('https://evil.test/records/a');
    await harness.runNotificationClick('/records/a');
    expect(harness.openedUrls).toEqual([`${origin}/`, `${origin}/records/a`]);
  });

  test('keeps previous cache', async () => {
    const harness = createHarness({});
    harness.seedCache('llog-offline-v0', '/index.html', 'v0');
    harness.seedCache('llog-offline-v1', '/index.html', 'v1');
    harness.seedCache('llog-offline-v1-install', '/index.html', 'install');
    harness.seedCache('other-cache', '/index.html', 'other');
    await harness.run('activate');

    expect(harness.cacheNames()).toEqual([
      'llog-offline-v0',
      'llog-offline-v1',
      'other-cache',
    ]);
  });

  test('prefers current shell', async () => {
    const harness = createHarness({});
    harness.seedCache('llog-offline-v0', '/index.html', 'old');
    harness.seedCache('llog-offline-v1', '/index.html', 'new');
    const response = await harness.runFetch('/records/a');
    expect(await response.text()).toBe('new');
  });

  test('strips cached redirects', async () => {
    const harness = createHarness({});

    harness.seedCache('llog-offline-v1', '/index.html', {
      body: 'cached',
      redirected: true,
    });

    const response = await harness.runFetch('/records/a');
    expect(response.redirected).toBe(false);
    expect(await response.text()).toBe('cached');
  });

  test('caches navigation shell', async () => {
    const harness = createHarness({
      '/_expo/static/js/web/entry-new.js':
        'paths: { index: "/_expo/static/js/web/index-new.js" }',
      '/_expo/static/js/web/index-new.js': 'js',
      '/records/a': '<script src="/_expo/static/js/web/entry-new.js"></script>',
    });

    const response = await harness.runFetch('/records/a');
    expect(await response.text()).toContain('entry-new.js');

    expect(harness.currentCachePaths()).toEqual([
      '/',
      '/_expo/static/js/web/entry-new.js',
      '/_expo/static/js/web/index-new.js',
      '/index.html',
    ]);
  });

  test('strips navigation redirects', async () => {
    const harness = createHarness({
      '/_expo/static/js/web/entry-redirected.js': 'js',
      '/records/a': {
        body: '<script src="/_expo/static/js/web/entry-redirected.js"></script>',
        redirected: true,
      },
    });

    const response = await harness.runFetch('/records/a');
    expect(response.redirected).toBe(false);
    expect(await response.text()).toContain('entry-redirected.js');
    const cachedResponse = await harness.runFetch('/records/b');
    expect(cachedResponse.redirected).toBe(false);
    expect(await cachedResponse.text()).toContain('entry-redirected.js');
  });

  test('keeps old shell', async () => {
    const harness = createHarness({
      '/records/a': '<script src="/_expo/static/js/web/missing.js"></script>',
    });

    harness.seedCache('llog-offline-v1', '/index.html', 'old');
    const response = await harness.runFetch('/records/a');
    expect(await response.text()).toBe('old');
    expect(harness.currentCachePaths()).toEqual(['/index.html']);
  });
});
