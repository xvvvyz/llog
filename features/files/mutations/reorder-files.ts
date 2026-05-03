import { db } from '@/lib/db';
import { reorderItems } from '@/lib/reorder-items';

type OrderedFile = { id: string };

export const reorderFiles = async (files: OrderedFile[]) => {
  return reorderItems(files, (id, order) => db.tx.files[id].update({ order }));
};
