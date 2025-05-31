import { db } from '@/utilities/db';

export const toggleUiLogTag = async ({
  isSelected,
  tagId,
}: {
  isSelected: boolean;
  tagId: string;
}) => {
  const auth = await db.getAuth();
  if (!auth) return;
  const action = isSelected ? 'unlink' : 'link';
  return db.transact(db.tx.ui[auth.id][action]({ logTags: tagId }));
};
