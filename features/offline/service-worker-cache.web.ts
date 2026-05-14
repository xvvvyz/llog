import { CACHE_RESOURCES_MESSAGE } from '@/features/offline/service-worker-cache-message';

const hasServiceWorkerSupport = () =>
  typeof window !== 'undefined' && 'serviceWorker' in navigator;

export const getCacheableAppResourceUrls = () => {
  if (typeof window === 'undefined') return [];
  const urls = new Set<string>(['/', '/index.html']);

  if (typeof document !== 'undefined') {
    for (const node of Array.from(
      document.querySelectorAll('script[src],link[href]')
    )) {
      const resourceUrl = node.getAttribute('src') ?? node.getAttribute('href');
      if (resourceUrl) urls.add(resourceUrl);
    }
  }

  if (typeof performance !== 'undefined') {
    for (const entry of performance.getEntriesByType('resource')) {
      urls.add(entry.name);
    }
  }

  return [...urls];
};

export const requestAppResourceCache = (
  registration: ServiceWorkerRegistration | null
) => {
  if (!registration || !hasServiceWorkerSupport()) return;

  const worker =
    registration.active ??
    navigator.serviceWorker.controller ??
    registration.waiting ??
    registration.installing;

  worker?.postMessage({
    type: CACHE_RESOURCES_MESSAGE,
    urls: getCacheableAppResourceUrls(),
  });
};
