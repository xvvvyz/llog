import { db } from '@/utilities/db';

export const toggleLogMember = async ({
  profileId,
  isSelected,
  logId,
}: {
  profileId: string;
  isSelected: boolean;
  logId?: string;
}) => {
  if (!logId) return;
  const action = isSelected ? 'unlink' : 'link';
  return db.transact(db.tx.logs[logId][action]({ profiles: profileId }));
};
