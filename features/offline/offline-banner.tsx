import { useConnectivity } from '@/features/offline/connectivity';
import { useOutbox } from '@/features/offline/outbox-hooks';
import * as outboxStore from '@/features/offline/outbox-store';
import { useDelayedTrue } from '@/hooks/use-delayed-true';
import { Icon } from '@/ui/icon';
import { Spinner } from '@/ui/spinner';
import { Text } from '@/ui/text';
import { WifiSlash } from 'phosphor-react-native';
import * as React from 'react';
import { View } from 'react-native';
import * as offlineBannerState from '@/features/offline/offline-banner-state';

const OfflineBannerContext =
  React.createContext<offlineBannerState.OfflineBannerState>(null);

export const OfflineBannerProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { isNetworkOffline } = useConnectivity();
  const outbox = useOutbox();
  const showOffline = useDelayedTrue(isNetworkOffline, { delayMs: 500 });

  React.useEffect(() => {
    if (!outbox.hydrated) return;
    void outboxStore.pruneDiscardedSubmissionAttachments();
  }, [outbox.hydrated, outbox.attachments, outbox.submissions]);

  const hasPendingWork = React.useMemo(
    () => outbox.hydrated && outboxStore.hasPendingOutboxWork(outbox),
    [outbox]
  );

  const [state, setState] =
    React.useState<offlineBannerState.OfflineBannerState>(null);

  React.useEffect(() => {
    setState((currentState) =>
      offlineBannerState.getNextOfflineBannerState({
        currentState,
        hasPendingWork,
        isNetworkOffline,
        outboxHydrated: outbox.hydrated,
        showOffline,
      })
    );
  }, [hasPendingWork, isNetworkOffline, outbox.hydrated, showOffline]);

  return (
    <OfflineBannerContext.Provider value={state}>
      {children}
    </OfflineBannerContext.Provider>
  );
};

export const OfflineBanner = () => {
  const state = React.useContext(OfflineBannerContext);
  if (!state) return null;

  return (
    <View className="flex-row px-4 py-2 gap-2 items-center justify-center md:px-8 md:justify-start">
      {state === 'offline' ? (
        <Icon className="text-muted-foreground" icon={WifiSlash} size={14} />
      ) : (
        <Spinner className="text-muted-foreground" size="icon" />
      )}
      <Text className="text-muted-foreground text-sm" numberOfLines={1}>
        {state === 'offline'
          ? 'Offline. Features are limited.'
          : 'Syncing saved changes.'}
      </Text>
    </View>
  );
};
