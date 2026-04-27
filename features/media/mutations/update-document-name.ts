import { db } from '@/lib/db';

export const updateDocumentName = async ({
  id,
  name,
}: {
  id?: string;
  name: string;
}) => {
  const trimmedName = name.trim();
  if (!id || !trimmedName || trimmedName.length > 255) return;
  return db.transact(db.tx.media[id].update({ name: trimmedName }));
};
