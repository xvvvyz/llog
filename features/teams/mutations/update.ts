import { db } from '@/lib/db';

export const updateTeam = async ({
  id,
  name,
}: {
  id: string;
  name: string;
}) => {
  return db.transact(db.tx.teams[id].update({ name: name.trim() }));
};
