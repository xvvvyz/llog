import type { Link } from '@/features/records/types/link';
import { db } from '@/lib/db';
import { getReorderedItems, reorderItems } from '@/lib/reorder-items';

type OrderedLink = Pick<Link, 'id'> & { order?: number | null };

export const reorderLinks = async (links: OrderedLink[]) => {
  if (links.some((link) => link.order != null)) {
    const reorderedLinks = getReorderedItems(links);

    return db.transact(
      reorderedLinks.map((link) =>
        db.tx.links[link.id].update({ order: link.order })
      )
    );
  }

  return reorderItems(links, (id, order) => db.tx.links[id].update({ order }));
};
