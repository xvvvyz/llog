import { db } from '@/lib/db';
import * as recordCardRefresh from '@/features/records/mutations/record-card-refresh';

export const deleteLink = async ({ id }: { id?: string }) => {
  if (!id) return;
  const recordId = await recordCardRefresh.getRecordIdForLink(id);
  const result = await db.transact(db.tx.links[id].delete());
  recordCardRefresh.queueRecordCardRefresh(recordId);
  return result;
};
