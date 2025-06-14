import { db } from '@/utilities/ui/db';

export const toggleLogTag = async ({
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
  return db.transact(db.tx.logTags[id][action]({ logs: logId }));
};
