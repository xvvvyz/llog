import type { ConnectionStatus } from '@instantdb/react-native';

const isInstantOnline = (status: ConnectionStatus) =>
  status === 'authenticated' || status === 'opened';

export const getConnectivityState = ({
  browserOnline,
  instantStatus,
  netInfoOnline,
}: {
  browserOnline: boolean;
  instantStatus: ConnectionStatus;
  netInfoOnline: boolean | null;
}) => {
  const hasKnownOfflineSignal =
    browserOnline === false || netInfoOnline === false;

  const instantUnavailable =
    instantStatus === 'closed' || instantStatus === 'errored';

  return {
    canRunNetworkActions:
      !hasKnownOfflineSignal && isInstantOnline(instantStatus),
    instantStatus,
    isOffline: hasKnownOfflineSignal || instantUnavailable,
    isNetworkOffline: hasKnownOfflineSignal,
  };
};
