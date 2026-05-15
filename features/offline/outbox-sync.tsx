import { useConnectivity } from '@/features/offline/connectivity';
import { runOutboxSync } from '@/features/offline/outbox-sync-core';
import * as outboxStore from '@/features/offline/outbox-store';
import { db } from '@/lib/db';
import * as React from 'react';

export const OutboxSyncRunner = () => {
  const auth = db.useAuth();
  const connectivity = useConnectivity();
  const outbox = outboxStore.useOutboxSnapshot();

  React.useEffect(() => {
    outboxStore.setOutboxOwnerUserId(auth.user?.id);
  }, [auth.user?.id]);

  React.useEffect(() => {
    if (!connectivity.canRunNetworkActions || !outbox.hydrated) return;
    if (!auth.user?.id || outbox.ownerUserId !== auth.user.id) return;
    const autoSyncable = outboxStore.getAutoSyncableSubmissions(outbox);
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
  }, [auth.user?.id, connectivity.canRunNetworkActions, outbox]);

  return null;
};
