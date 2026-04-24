import type * as webPushTypes from '@/features/account/types/web-push';

export type {
  WebPushState,
  WebPushSupportState,
} from '@/features/account/types/web-push';

export const isIosWebDevice = () => false;
export const isSafariBrowser = () => false;
export const isStandaloneWebApp = () => false;
export const registerWebPushServiceWorker = async () => null;

export const getWebPushSupportState = (): webPushTypes.WebPushSupportState =>
  'unsupported';

export const getWebPushState =
  async (): Promise<webPushTypes.WebPushState> => ({ status: 'unsupported' });

export const syncWebPushSubscription = async () => getWebPushState();

export const enableWebPush = async () => {
  throw new Error('Web push is unavailable on this platform.');
};

export const disableWebPush = async () => getWebPushState();
export const detachWebPushSubscription = async () => {};
