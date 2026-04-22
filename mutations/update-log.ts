import { db } from '@/lib/db';

export const updateLog = async ({
  color,
  id,
  name,
}: {
  color?: number;
  id: string;
  name?: string;
}) => {
  return db.transact(db.tx.logs[id].update({ color, name }));
};
