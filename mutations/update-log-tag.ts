import { db } from '@/utilities/db';

export const updateLogTag = ({ id, name }: { id: string; name: string }) => {
  db.transact(db.tx.logTags[id].update({ name }));
};
