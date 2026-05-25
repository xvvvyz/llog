import type { FileItem } from '@/features/files/types/file';
import { db } from '@/lib/db';
import { getReorderedItems, reorderItems } from '@/lib/reorder-items';

type OrderedFile = Pick<FileItem, 'id'> & { order?: number | null };

export const reorderFiles = async (files: OrderedFile[]) => {
  if (files.some((file) => file.order != null)) {
    const reorderedFiles = getReorderedItems(files);

    return db.transact(
      reorderedFiles.map((file) =>
        db.tx.files[file.id].update({ order: file.order })
      )
    );
  }

  return reorderItems(files, (id, order) => db.tx.files[id].update({ order }));
};
