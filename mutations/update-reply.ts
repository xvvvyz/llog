import { db } from '@/lib/db';

export const updateReply = async ({
  id,
  text,
}: {
  id?: string;
  text: string;
}) => {
  if (!id) return;
  return db.transact(db.tx.replies[id].update({ text }));
};
