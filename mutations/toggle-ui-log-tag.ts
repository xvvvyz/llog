import { db } from '@/utilities/db';

export const toggleUiLogTag = ({
  isSelected,
  tagId,
  userId,
}: {
  isSelected: boolean;
  tagId: string;
  userId?: string;
}) => {
  if (!userId) return;
  const action = isSelected ? 'unlink' : 'link';
  db.transact(db.tx.ui[userId][action]({ logTags: tagId }));
};
