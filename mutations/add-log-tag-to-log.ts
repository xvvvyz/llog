import { db } from '@/utilities/db';

export const addTagToLog = async ({
  logId,
  tagId,
}: {
  logId?: string;
  tagId: string;
}) => {
  if (!logId) return;
  return db.transact(db.tx.logs[logId].link({ tags: tagId }));
};
