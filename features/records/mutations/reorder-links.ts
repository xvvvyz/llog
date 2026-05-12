import type { Link } from '@/features/records/types/link';
import { db } from '@/lib/db';
import { reorderItems } from '@/lib/reorder-items';

type OrderedLink = Pick<Link, 'id'>;

export const reorderLinks = async (links: OrderedLink[]) => {
  return reorderItems(links, (id, order) => db.tx.links[id].update({ order }));
};
