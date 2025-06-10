import { db } from '@/utilities/ui/db';

export const updateRule = async ({
  id,
  prompt,
}: {
  id?: string;
  prompt?: string;
}) => {
  if (!id) return;
  return db.transact(db.tx.rules[id].update({ prompt }));
};
