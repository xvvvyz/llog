import { db } from '@/lib/db';

export const toggleLogTag = async ({
  logId,
  selected,
  tagId,
}: {
  logId?: string;
  selected: boolean;
  tagId: string;
}) => {
  if (!logId) return;
  const action = selected ? 'link' : 'unlink';
  return db.transact(db.tx.tags[tagId][action]({ logs: logId }));
};
