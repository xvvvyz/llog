import { db } from '@/utilities/db';

export const updateComment = async ({
  id,
  text,
}: {
  id?: string;
  text: string;
}) => {
  if (!id) return;
  return db.transact(db.tx.comments[id].update({ text }));
};
