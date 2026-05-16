import { getConnectivityState } from '@/features/offline/connectivity-state';
import { useDelayedFalse } from '@/hooks/use-delayed-false';
import { useDelayedTrue } from '@/hooks/use-delayed-true';
import { db } from '@/lib/db';
import { addEventListener as addNetInfoEventListener } from '@react-native-community/netinfo';
import * as React from 'react';
import { Platform } from 'react-native';

const REACHABILITY_INTERVAL_MS = 10_000;
const REACHABILITY_TIMEOUT_MS = 8_000;
const REACHABILITY_FAILURE_THRESHOLD = 2;
let reachabilitySnapshot: boolean | null = null;
let reachabilityInterval: ReturnType<typeof setInterval> | undefined;
let reachabilityInFlight: Promise<void> | undefined;
let reachabilityFailureCount = 0;
let reachabilitySubscriberCount = 0;
const reachabilityListeners = new Set<() => void>();

const emitReachability = () => {
  for (const listener of reachabilityListeners) listener();
};

const setReachabilitySnapshot = (next: boolean | null) => {
  if (reachabilitySnapshot === next) return;
  reachabilitySnapshot = next;
  emitReachability();
};

const useBrowserOnline = () => {
  const subscribe = React.useCallback((notify: () => void) => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') {
      return () => undefined;
    }

    window.addEventListener('online', notify);
    window.addEventListener('offline', notify);

    return () => {
      window.removeEventListener('online', notify);
      window.removeEventListener('offline', notify);
    };
  }, []);

  return React.useSyncExternalStore(
    subscribe,
    () =>
      Platform.OS === 'web' && typeof navigator !== 'undefined'
        ? navigator.onLine
        : true,
    () => true
  );
};

const useNetInfoOnline = () => {
  const [isConnected, setIsConnected] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    const unsubscribe = addNetInfoEventListener((state) => {
      setIsConnected(state.isConnected);
    });

    return unsubscribe;
  }, []);

  return isConnected;
};

const probeApiReachability = async () => {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL;
  if (!apiUrl || typeof fetch === 'undefined') return true;

  const controller =
    typeof AbortController !== 'undefined' ? new AbortController() : undefined;

  const timeout =
    controller && setTimeout(() => controller.abort(), REACHABILITY_TIMEOUT_MS);

  try {
    const response = await fetch(`${apiUrl}/health`, {
      cache: 'no-store',
      signal: controller?.signal,
    });

    return response.ok;
  } catch {
    return false;
  } finally {
    if (timeout) clearTimeout(timeout);
  }
};

const checkReachability = async () => {
  if (reachabilityInFlight) return reachabilityInFlight;

  reachabilityInFlight = (async () => {
    try {
      const isReachable = await probeApiReachability();

      if (isReachable) {
        reachabilityFailureCount = 0;
        setReachabilitySnapshot(true);
        return;
      }

      reachabilityFailureCount += 1;

      if (reachabilityFailureCount >= REACHABILITY_FAILURE_THRESHOLD) {
        setReachabilitySnapshot(false);
      }
    } finally {
      reachabilityInFlight = undefined;
    }
  })();

  return reachabilityInFlight;
};

const startReachability = () => {
  reachabilitySubscriberCount += 1;
  void checkReachability();

  reachabilityInterval ??= setInterval(
    checkReachability,
    REACHABILITY_INTERVAL_MS
  );
};

const stopReachability = () => {
  reachabilitySubscriberCount = Math.max(0, reachabilitySubscriberCount - 1);
  if (reachabilitySubscriberCount > 0) return;
  if (reachabilityInterval) clearInterval(reachabilityInterval);
  reachabilityInterval = undefined;
};

const subscribeReachability = (listener: () => void) => {
  reachabilityListeners.add(listener);

  return () => {
    reachabilityListeners.delete(listener);
  };
};

const useApiReachability = ({
  browserOnline,
  netInfoOnline,
}: {
  browserOnline: boolean;
  netInfoOnline: boolean | null;
}) => {
  const isReachable = React.useSyncExternalStore(
    subscribeReachability,
    () => reachabilitySnapshot,
    () => null
  );

  React.useEffect(() => {
    if (browserOnline === false || netInfoOnline === false) {
      reachabilityFailureCount = REACHABILITY_FAILURE_THRESHOLD;
      setReachabilitySnapshot(false);
      return;
    }

    reachabilityFailureCount = 0;
    startReachability();
    return stopReachability;
  }, [browserOnline, netInfoOnline]);

  return isReachable;
};

export const useConnectivity = () => {
  const instantStatus = db.useConnectionStatus();
  const browserOnline = useBrowserOnline();
  const netInfoOnline = useNetInfoOnline();

  const reachabilityOnline = useApiReachability({
    browserOnline,
    netInfoOnline,
  });

  const state = getConnectivityState({
    browserOnline,
    instantStatus,
    netInfoOnline,
    reachabilityOnline,
  });

  const canRunNetworkActions = useDelayedFalse(state.canRunNetworkActions, {
    delayMs: 500,
  });

  const isOffline = useDelayedTrue(state.isOffline, { delayMs: 500 });

  const isNetworkOffline = useDelayedTrue(state.isNetworkOffline, {
    delayMs: 500,
  });

  return {
    ...state,
    canRunNetworkActions,
    canRunNetworkActionsImmediately: state.canRunNetworkActions,
    isOffline,
    isOfflineImmediately: state.isOffline,
    isNetworkOffline,
    isNetworkOfflineImmediately: state.isNetworkOffline,
  };
};
