import { db } from '@/lib/db';

export const updateLink = async ({
  id,
  label,
  url,
}: {
  id: string;
  label: string;
  url: string;
}) => {
  return db.transact(db.tx.links[id].update({ label, url }));
};
