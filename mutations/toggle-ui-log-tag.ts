import { getUi } from '@/queries/get-ui';
import { db } from '@/utilities/ui/db';

export const toggleUiLogTag = async ({
  isSelected,
  tagId,
}: {
  isSelected: boolean;
  tagId: string;
}) => {
  const ui = await getUi();
  if (!ui) return;
  const action = isSelected ? 'unlink' : 'link';
  return db.transact(db.tx.ui[ui.id][action]({ logTags: tagId }));
};
