import type { Link } from '@/features/records/types/link';
import { db } from '@/lib/db';
import * as recordCardRefresh from '@/features/records/mutations/record-card-refresh';

export const updateLink = async ({
  id,
  label,
  url,
}: Pick<Link, 'id' | 'label' | 'url'>) => {
  const recordId = await recordCardRefresh.getRecordIdForLink(id);
  const result = await db.transact(db.tx.links[id].update({ label, url }));
  recordCardRefresh.queueRecordCardRefresh(recordId);
  return result;
};
