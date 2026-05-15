import type { Link } from '@/features/records/types/link';
import { db } from '@/lib/db';

export const updateLink = async ({
  id,
  label,
  url,
}: Pick<Link, 'id' | 'label' | 'url'>) => {
  return db.transact(db.tx.links[id].update({ label, url }));
};
