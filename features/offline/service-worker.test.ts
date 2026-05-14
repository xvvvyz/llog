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
  request?: RequestLike;
  respondWith?: (response: Promise<Response> | Response) => void;
  waitUntil: (promise: Promise<unknown>) => void;
};

type WorkerListener = (event: WorkerEvent) => void;

type FakeWorker = {
  __LLOG_SW_VERSION__?: string;
  addEventListener: (type: string, listener: WorkerListener) => void;
  clients: { claim: () => Promise<void>; matchAll: () => Promise<never[]> };
  location: { origin: string };
  registration: { showNotification: () => Promise<void> };
  skipWaiting: () => Promise<void>;
};

type FetchFixture = string | { body?: string; status?: number };

type RequestLike =
  | RequestInfo
  | URL
  | { method?: string; mode?: string; url: string };

type Fetcher = (input: RequestLike, init?: RequestInit) => Promise<Response>;

const hasUrl = (input: unknown): input is { url: string } =>
  typeof input === 'object' &&
  input !== null &&
  'url' in input &&
  typeof input.url === 'string';

const swPath = (input: RequestLike) => {
  const value = hasUrl(input)
    ? input.url
    : input instanceof URL
      ? input.href
      : input;

  const url = new URL(value, origin);
  return `${url.pathname}${url.search}`;
};

const fixtureResponse = (fixture?: FetchFixture) => {
  if (!fixture) return new Response('missing', { status: 404 });
  if (typeof fixture === 'string') return new Response(fixture);
  return new Response(fixture.body ?? '', { status: fixture.status ?? 200 });
};

function createHarness(fixtures: Record<string, FetchFixture>) {
  const listeners = new Map<string, WorkerListener[]>();
  const stores = new Map<string, Map<string, Response>>();
  const fetchCalls: string[] = [];
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
      const path = swPath(request);

      for (const cache of stores.values()) {
        const response = cache.get(path);
        if (response) return response;
      }
    },
    open: async (name: string) =>
      ({
        keys: async () =>
          [...store(name).keys()].map(
            (path) => new Request(`${origin}${path}`)
          ),
        match: async (request: RequestInfo | URL) =>
          store(name).get(swPath(request)),
        put: async (request: RequestInfo | URL, response: Response) => {
          store(name).set(swPath(request), response);
        },
      }) as Partial<Cache> as Cache,
  };

  const fakeFetch: Fetcher = async (input) => {
    const path = swPath(input);
    fetchCalls.push(path);
    return fixtureResponse(fixtures[path]);
  };

  const worker: FakeWorker = {
    addEventListener: (type, listener) => {
      listeners.set(type, [...(listeners.get(type) ?? []), listener]);
    },
    clients: { claim: async () => {}, matchAll: async () => [] },
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

  const runFetch = async (path: string) => {
    const promises: Promise<unknown>[] = [];
    const responses: Promise<Response>[] = [];

    for (const listener of listeners.get('fetch') ?? []) {
      listener({
        request: { method: 'GET', mode: 'navigate', url: `${origin}${path}` },
        respondWith: (response) => responses.push(Promise.resolve(response)),
        waitUntil: (promise) => promises.push(promise),
      });
    }

    await Promise.all(promises);
    const [response] = responses;
    if (!response) throw new Error('Fetch was not handled.');
    return response;
  };

  const seedCache = (name: string, path: string, body = '') => {
    store(name).set(path, new Response(body));
  };

  return {
    cacheNames: () => [...stores.keys()].sort(),
    currentCachePaths,
    fetchCalls,
    run,
    runFetch,
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

  test('keeps previous cache', async () => {
    const harness = createHarness({});
    harness.seedCache('llog-offline-v6', '/index.html', 'v6');
    harness.seedCache('llog-offline-v7', '/index.html', 'v7');
    harness.seedCache('llog-offline-v8', '/index.html', 'v8');
    harness.seedCache('llog-offline-v8-install', '/index.html', 'install');
    harness.seedCache('other-cache', '/index.html', 'other');
    await harness.run('activate');

    expect(harness.cacheNames()).toEqual([
      'llog-offline-v7',
      'llog-offline-v8',
      'other-cache',
    ]);
  });

  test('prefers current shell', async () => {
    const harness = createHarness({});
    harness.seedCache('llog-offline-v7', '/index.html', 'old');
    harness.seedCache('llog-offline-v8', '/index.html', 'new');
    const response = await harness.runFetch('/records/a');
    expect(await response.text()).toBe('new');
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

  test('keeps old shell', async () => {
    const harness = createHarness({
      '/records/a': '<script src="/_expo/static/js/web/missing.js"></script>',
    });

    harness.seedCache('llog-offline-v8', '/index.html', 'old');
    const response = await harness.runFetch('/records/a');
    expect(await response.text()).toBe('old');
    expect(harness.currentCachePaths()).toEqual(['/index.html']);
  });
});
