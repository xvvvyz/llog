import { db } from '@/utilities/db';

export const toggleTag = async ({
  id,
  isSelected,
  logId,
}: {
  id: string;
  isSelected: boolean;
  logId?: string;
}) => {
  if (!logId) return;
  const action = isSelected ? 'unlink' : 'link';
  return db.transact(db.tx.tags[id][action]({ logs: logId }));
};
