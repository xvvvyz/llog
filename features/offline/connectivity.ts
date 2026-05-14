import { getConnectivityState } from '@/features/offline/connectivity-state';
import { db } from '@/lib/db';
import { addEventListener as addNetInfoEventListener } from '@react-native-community/netinfo';
import * as React from 'react';
import { Platform } from 'react-native';

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

export const useConnectivity = () => {
  const instantStatus = db.useConnectionStatus();
  const browserOnline = useBrowserOnline();
  const netInfoOnline = useNetInfoOnline();
  return getConnectivityState({ browserOnline, instantStatus, netInfoOnline });
};
