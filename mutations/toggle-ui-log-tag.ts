import { resolveUiId } from '@/queries/resolve-ui-id';
import { db } from '@/utilities/db';

export const toggleUiLogTag = async ({
  isSelected,
  tagId,
  uiId,
}: {
  isSelected: boolean;
  tagId: string;
  uiId?: string;
}) => {
  const resolvedUiId = await resolveUiId(uiId);
  if (!resolvedUiId) return;
  const action = isSelected ? 'unlink' : 'link';
  return db.transact(db.tx.ui[resolvedUiId][action]({ logTags: tagId }));
};
