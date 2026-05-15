import type { Log } from '@/features/logs/types/log';
import { db } from '@/lib/db';

export const updateLog = async ({
  color,
  id,
  name,
}: Pick<Log, 'id'> & Partial<Pick<Log, 'color' | 'name'>>) => {
  return db.transact(db.tx.logs[id].update({ color, name: name?.trim() }));
};
