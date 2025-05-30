import { db } from '@/utilities/db';

export const addLogTagToLog = ({
  logId,
  tagId,
}: {
  logId?: string;
  tagId: string;
}) => {
  if (!logId) return;
  db.transact(db.tx.logs[logId].link({ logTags: tagId }));
};
