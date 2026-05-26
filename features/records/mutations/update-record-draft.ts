import * as recordIdentity from '@/domain/records/identity-fields';
import { db } from '@/lib/db';

export const updateRecordDraft = async ({
  authorId,
  date,
  id,
  isPinned,
  logId,
  tagIds,
  teamId,
  text,
}: {
  authorId?: string;
  date?: string | number;
  id?: string;
  isPinned?: boolean;
  logId?: string;
  tagIds?: string[];
  teamId?: string;
  text: string;
}) => {
  if (!id) return;
  const uniqueTagIds = [...new Set(tagIds ?? [])];

  const requiredDraftFields =
    authorId && logId && teamId ? { authorId, logId, teamId } : undefined;

  const recordUpdate = {
    ...(requiredDraftFields
      ? {
          ...recordIdentity.getRecordIdentityFields(requiredDraftFields),
          date: date ?? new Date().toISOString(),
          ...recordIdentity.getStatusFields('draft'),
          teamId: requiredDraftFields.teamId,
        }
      : {}),
    ...(isPinned != null ? { isPinned } : {}),
    text,
  };

  const recordTx = db.tx.records[id].update(
    recordUpdate,
    requiredDraftFields ? { upsert: true } : { upsert: false }
  );

  return db.transact([
    requiredDraftFields
      ? recordTx.link({
          author: requiredDraftFields.authorId,
          log: requiredDraftFields.logId,
        })
      : recordTx,
    ...uniqueTagIds.map((tagId) => db.tx.records[id].link({ tags: tagId })),
  ]);
};
