import { db } from '@/utilities/db';

export const toggleLogTag = ({
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
  db.transact(db.tx.logTags[id][action]({ logs: logId }));
};
