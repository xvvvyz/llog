import type * as webPushTypes from '@/features/account/types/web-push';
import { apiOrThrow } from '@/lib/api';

export type {
  WebPushState,
  WebPushSupportState,
} from '@/features/account/types/web-push';

let registrationPromise: Promise<ServiceWorkerRegistration | null> | null =
  null;

const isStandaloneNavigator = (
  value: Navigator
): value is Navigator & { standalone?: boolean } => 'standalone' in value;

const toUint8Array = (value: string) => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - (normalized.length % 4 || 4)) % 4);
  const raw = window.atob(normalized + padding);
  const bytes = new Uint8Array(raw.length);

  for (let index = 0; index < raw.length; index += 1) {
    bytes[index] = raw.charCodeAt(index);
  }

  return bytes;
};

export const isIosWebDevice = () =>
  /iPad|iPhone|iPod/.test(window.navigator.userAgent) ||
  (window.navigator.platform === 'MacIntel' &&
    window.navigator.maxTouchPoints > 1);

export const isSafariBrowser = () => {
  const { userAgent } = window.navigator;

  return (
    /Safari/.test(userAgent) && !/CriOS|FxiOS|EdgiOS|Chrome/.test(userAgent)
  );
};

export const isStandaloneWebApp = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (isStandaloneNavigator(window.navigator) &&
    window.navigator.standalone === true);

export const getWebPushSupportState = (): webPushTypes.WebPushSupportState => {
  if (typeof window === 'undefined') {
    return 'unsupported';
  }

  if (isIosWebDevice() && isSafariBrowser() && !isStandaloneWebApp()) {
    return 'ios-home-screen-required';
  }

  return hasFullPushSupport() ? 'supported' : 'unsupported';
};

const hasServiceWorkerSupport = () =>
  typeof window !== 'undefined' && 'serviceWorker' in navigator;

const hasPushApis = () =>
  typeof window !== 'undefined' &&
  'Notification' in window &&
  'PushManager' in window &&
  hasServiceWorkerSupport();

const hasFullPushSupport = () =>
  !!process.env.EXPO_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY && hasPushApis();

const isSupported = () => getWebPushSupportState() === 'supported';

const getSubscription = async () => {
  if (!hasPushApis()) return null;
  const registration = await registerWebPushServiceWorker();
  return registration?.pushManager.getSubscription() ?? null;
};

const saveSubscription = async (subscription: PushSubscription) =>
  apiOrThrow(
    '/push/subscriptions',
    {
      body: JSON.stringify({ subscription: subscription.toJSON() }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    },
    'Failed to save notification subscription'
  );

const deleteSubscription = async (endpoint: string) =>
  apiOrThrow(
    '/push/subscriptions',
    {
      body: JSON.stringify({ endpoint }),
      headers: { 'Content-Type': 'application/json' },
      method: 'DELETE',
    },
    'Failed to remove notification subscription'
  );

export const registerWebPushServiceWorker = async () => {
  if (!hasServiceWorkerSupport()) return null;

  if (!registrationPromise) {
    registrationPromise = (async () => {
      try {
        await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        return await navigator.serviceWorker.ready;
      } catch (error) {
        registrationPromise = null;
        throw error;
      }
    })();
  }

  return registrationPromise;
};

export const getWebPushState = async (): Promise<webPushTypes.WebPushState> => {
  if (!isSupported()) {
    return { status: 'unsupported' };
  }

  if (Notification.permission === 'denied') {
    return { status: 'blocked' };
  }

  const subscription = await getSubscription();

  return subscription && Notification.permission === 'granted'
    ? { endpoint: subscription.endpoint, status: 'enabled' }
    : { status: 'disabled' };
};

export const syncWebPushSubscription =
  async (): Promise<webPushTypes.WebPushState> => {
    if (!isSupported()) {
      return { status: 'unsupported' };
    }

    if (Notification.permission === 'denied') {
      return { status: 'blocked' };
    }

    const subscription = await getSubscription();

    if (!subscription || Notification.permission !== 'granted') {
      return { status: 'disabled' };
    }

    const freshPermission = await Notification.requestPermission();

    if (freshPermission === 'denied') {
      return { status: 'blocked' };
    }

    if (freshPermission !== 'granted') {
      return { status: 'disabled' };
    }

    await saveSubscription(subscription);
    return { endpoint: subscription.endpoint, status: 'enabled' };
  };

export const enableWebPush = async () => {
  if (!isSupported()) {
    return { status: 'unsupported' };
  }

  const permission = await Notification.requestPermission();

  if (permission !== 'granted') {
    return getWebPushState();
  }

  const registration = await registerWebPushServiceWorker();

  if (!registration) {
    throw new Error('Failed to register the service worker.');
  }

  let subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      applicationServerKey: toUint8Array(
        process.env.EXPO_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY!
      ),
      userVisibleOnly: true,
    });
  }

  await saveSubscription(subscription);

  return {
    endpoint: subscription.endpoint,
    status: 'enabled',
  } satisfies webPushTypes.WebPushState;
};

export const disableWebPush = async () => {
  const subscription = await getSubscription();

  if (subscription) {
    try {
      await deleteSubscription(subscription.endpoint);
    } finally {
      await subscription.unsubscribe();
    }
  }

  return getWebPushState();
};

export const detachWebPushSubscription = async () => {
  const subscription = await getSubscription();
  if (!subscription) return;

  try {
    await deleteSubscription(subscription.endpoint);
  } finally {
    await subscription.unsubscribe();
  }
};
