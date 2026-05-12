import type { FileItem } from '@/features/files/types/file';
import { db } from '@/lib/db';
import { reorderItems } from '@/lib/reorder-items';

type OrderedFile = Pick<FileItem, 'id'>;

export const reorderFiles = async (files: OrderedFile[]) => {
  return reorderItems(files, (id, order) => db.tx.files[id].update({ order }));
};
