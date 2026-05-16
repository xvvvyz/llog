import type { ConnectionStatus } from '@instantdb/react-native';

const isInstantOnline = (status: ConnectionStatus) =>
  status === 'authenticated' || status === 'opened';

export const getConnectivityState = ({
  browserOnline,
  instantStatus,
  netInfoOnline,
  reachabilityOnline,
}: {
  browserOnline: boolean;
  instantStatus: ConnectionStatus;
  netInfoOnline: boolean | null;
  reachabilityOnline: boolean | null;
}) => {
  const hasKnownOfflineSignal =
    browserOnline === false ||
    netInfoOnline === false ||
    reachabilityOnline === false;

  const instantUnavailable =
    instantStatus === 'closed' || instantStatus === 'errored';

  return {
    canRunNetworkActions:
      !hasKnownOfflineSignal &&
      reachabilityOnline === true &&
      isInstantOnline(instantStatus),
    instantStatus,
    isOffline: hasKnownOfflineSignal || instantUnavailable,
    isNetworkOffline: hasKnownOfflineSignal,
  };
};
