import { fetchOutboxNetworkReachability } from '@/features/offline/outbox-network';
import * as outboxStore from '@/features/offline/outbox-store';
import { db } from '@/lib/db';

export const applyRecordPin = ({
  id,
  isPinned,
}: {
  id: string;
  isPinned: boolean;
}) => {
  return db.transact(db.tx.records[id].update({ isPinned }));
};

export const toggleRecordPin = async ({
  id,
  isPinned,
}: {
  id: string;
  isPinned: boolean;
}) => {
  if (!id) return;
  outboxStore.queueRecordPin({ isPinned, recordId: id });
  if ((await fetchOutboxNetworkReachability()) !== true) return;

  try {
    await applyRecordPin({ id, isPinned });
    outboxStore.clearQueuedRecordPin({ isPinned, recordId: id });
  } catch (error) {
    if ((await fetchOutboxNetworkReachability()) !== true) return;
    outboxStore.clearQueuedRecordPin({ isPinned, recordId: id });
    throw error;
  }
};
