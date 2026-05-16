import * as push from '@/features/account/lib/web-push';
import * as React from 'react';
import { Platform } from 'react-native';

type UseWebPushNotificationsOptions = {
  isSignedIn: boolean;
  onIosSetupRequired: () => void;
};

export const useWebPushNotifications = ({
  isSignedIn,
  onIosSetupRequired,
}: UseWebPushNotificationsOptions) => {
  const [isPushPending, setIsPushPending] = React.useState(false);

  const [pendingPushState, setPendingPushState] =
    React.useState<push.WebPushState | null>(null);

  const [pushState, setPushState] = React.useState<push.WebPushState>({
    status: 'unsupported',
  });

  const [pushSupport, setPushSupport] =
    React.useState<push.WebPushSupportState>('unsupported');

  React.useEffect(() => {
    if (Platform.OS !== 'web') return;
    setPushSupport(push.getWebPushSupportState());
  }, []);

  React.useEffect(() => {
    if (Platform.OS !== 'web' || !isSignedIn) return;
    let cancelled = false;

    void (async () => {
      try {
        const state = await push.syncWebPushSubscription();
        if (!cancelled) setPushState(state);
      } catch (error) {
        console.error('Failed to refresh web push state', error);
        const state = await push.getWebPushState();
        if (!cancelled) setPushState(state);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isSignedIn]);

  React.useEffect(() => {
    if (Platform.OS !== 'web' || !isSignedIn) return;

    const handleVisibilityChange = async () => {
      if (document.visibilityState !== 'visible') return;

      try {
        setPushState(await push.getWebPushState());
      } catch (error) {
        console.error(error);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isSignedIn]);

  const effectivePushState = pendingPushState ?? pushState;
  const pushEnabled = effectivePushState.status === 'enabled';

  const isPushToggleDisabled =
    isPushPending ||
    pushState.status === 'blocked' ||
    (!isSignedIn && pushSupport !== 'ios-home-screen-required') ||
    (effectivePushState.status === 'unsupported' &&
      pushSupport !== 'ios-home-screen-required');

  const handleTogglePush = React.useCallback(async () => {
    if (Platform.OS !== 'web') return;

    if (pushSupport === 'ios-home-screen-required') {
      onIosSetupRequired();
      return;
    }

    if (
      pushState.status === 'unsupported' ||
      pushState.status === 'blocked' ||
      !isSignedIn
    ) {
      return;
    }

    const optimisticState =
      pushState.status === 'enabled'
        ? ({ status: 'disabled' } satisfies push.WebPushState)
        : ({
            endpoint: pushState.endpoint,
            status: 'enabled',
          } satisfies push.WebPushState);

    setPendingPushState(optimisticState);
    setIsPushPending(true);

    try {
      const nextState =
        pushState.status === 'enabled'
          ? await push.disableWebPush()
          : await push.enableWebPush();

      if (nextState.status === 'blocked') {
        alert({
          message: 'Allow access to send notifications.',
          title: 'Notifications',
        });
      }

      setPushState(nextState);
      setPendingPushState(null);
    } catch {
      setPendingPushState(null);
      // noop
    } finally {
      setIsPushPending(false);
    }
  }, [isSignedIn, onIosSetupRequired, pushState, pushSupport]);

  return { handleTogglePush, isPushToggleDisabled, pushEnabled, pushState };
};
