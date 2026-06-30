import { resolveUiId } from '@/features/account/queries/resolve-ui-id';
import { db } from '@/lib/db';

export const toggleUiLogsFilterTag = async ({
  selected,
  tagId,
  uiId,
}: {
  selected: boolean;
  tagId: string;
  uiId?: string;
}) => {
  const resolvedUiId = await resolveUiId(uiId);
  if (!resolvedUiId) return;
  const action = selected ? 'link' : 'unlink';
  return db.transact(db.tx.ui[resolvedUiId][action]({ tags: tagId }));
};

export const clearUiLogsFilterTags = async ({
  tagIds,
  uiId,
}: {
  tagIds: string[];
  uiId?: string;
}) => {
  if (!tagIds.length) return;
  const resolvedUiId = await resolveUiId(uiId);
  if (!resolvedUiId) return;
  return db.transact(db.tx.ui[resolvedUiId].unlink({ tags: tagIds }));
};
