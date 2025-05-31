import { db } from '@/utilities/db';

export const updateLog = async ({
  color,
  id,
  name,
}: {
  color?: number;
  id?: string;
  name?: string;
}) => {
  if (!id) return;
  return db.transact(db.tx.logs[id].update({ color, name }));
};
