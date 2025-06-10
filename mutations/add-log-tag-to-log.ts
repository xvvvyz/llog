import { db } from '@/utilities/ui/db';

export const addLogTagToLog = async ({
  logId,
  tagId,
}: {
  logId?: string;
  tagId: string;
}) => {
  if (!logId) return;
  return db.transact(db.tx.logs[logId].link({ logTags: tagId }));
};
