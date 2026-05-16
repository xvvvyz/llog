import * as React from 'react';

import {
  addEventListener,
  fetch as fetchNetInfo,
  refresh,
  type NetInfoState,
  type NetInfoSubscription,
} from '@react-native-community/netinfo';

export type OutboxNetworkReachability = boolean | undefined;

export const getOutboxNetworkReachabilityFromState = (
  state: Pick<NetInfoState, 'isConnected' | 'isInternetReachable'>
): OutboxNetworkReachability => {
  if (state.isConnected === false || state.isInternetReachable === false) {
    return false;
  }

  if (state.isInternetReachable === true) return true;
  return undefined;
};

export const fetchOutboxNetworkReachability =
  async (): Promise<OutboxNetworkReachability> => {
    const state = await refresh();
    return getOutboxNetworkReachabilityFromState(state);
  };

export const useOutboxNetworkReachability = () => {
  const [reachability, setReachability] =
    React.useState<OutboxNetworkReachability>();

  React.useEffect(() => {
    let active = true;
    let unsubscribe: NetInfoSubscription | undefined;

    const update = (state: NetInfoState) => {
      if (!active) return;
      setReachability(getOutboxNetworkReachabilityFromState(state));
    };

    unsubscribe = addEventListener(update);

    void fetchNetInfo()
      .then(update)
      .catch(() => {
        if (active) setReachability(undefined);
      });

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, []);

  return reachability;
};
