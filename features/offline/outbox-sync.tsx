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

    if (
      !outboxStore.getAutoSyncableSubmissions(outbox).length &&
      !outboxStore.getDiscardedSubmissions(outbox).length
    ) {
      return;
    }

    void runOutboxSync();
  }, [auth.user?.id, connectivity.canRunNetworkActions, outbox]);

  return null;
};
