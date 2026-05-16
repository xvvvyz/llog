import { useConnectivity } from '@/features/offline/connectivity';
import { runOutboxSync } from '@/features/offline/outbox-sync-core';
import * as outboxStore from '@/features/offline/outbox-store';
import { db } from '@/lib/db';
import * as React from 'react';

export const OutboxSyncRunner = () => {
  const auth = db.useAuth();
  const connectivity = useConnectivity();
  const outbox = outboxStore.useOutboxSnapshot();

  const wasOnlineRef = React.useRef(
    connectivity.canRunNetworkActionsImmediately
  );

  React.useEffect(() => {
    outboxStore.setOutboxOwnerUserId(auth.user?.id);
  }, [auth.user?.id]);

  React.useEffect(() => {
    if (!auth.user?.id || !connectivity.canRunNetworkActionsImmediately) return;
    const shouldRetryFailed = wasOnlineRef.current === false;
    wasOnlineRef.current = true;

    void outboxStore.ensureOutboxHydrated().then(() => {
      if (shouldRetryFailed) outboxStore.retryFailedOutboxWork();
      void runOutboxSync();
    });
  }, [auth.user?.id, connectivity.canRunNetworkActionsImmediately]);

  React.useEffect(() => {
    if (connectivity.canRunNetworkActionsImmediately) return;
    wasOnlineRef.current = false;
  }, [connectivity.canRunNetworkActionsImmediately]);

  React.useEffect(() => {
    if (!connectivity.canRunNetworkActionsImmediately || !outbox.hydrated) {
      return;
    }

    if (!auth.user?.id || outbox.ownerUserId !== auth.user.id) return;
    const autoSyncable = outboxStore.getStartableAutoSyncSubmissions(outbox);
    const discarded = outboxStore.getDiscardedSubmissions(outbox);

    if (!autoSyncable.length && !discarded.length) {
      const nextRetryTime = outboxStore.getNextAutoRetryTime(outbox);
      if (nextRetryTime == null) return;

      const timeout = setTimeout(
        () => void runOutboxSync(),
        Math.max(0, nextRetryTime - Date.now())
      );

      return () => clearTimeout(timeout);
    }

    if (autoSyncable.length || discarded.length) {
      void runOutboxSync();
      return;
    }
  }, [auth.user?.id, connectivity.canRunNetworkActionsImmediately, outbox]);

  return null;
};
