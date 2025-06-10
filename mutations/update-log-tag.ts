import { db } from '@/utilities/ui/db';

export const updateLogTag = async ({
  id,
  name,
}: {
  id: string;
  name: string;
}) => {
  return db.transact(db.tx.logTags[id].update({ name }));
};
