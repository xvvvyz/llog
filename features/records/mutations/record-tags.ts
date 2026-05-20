import { db } from '@/lib/db';
import * as cardMutations from '@/features/cards/mutations/cards';
import { getPrependTagOrderTransactions } from '@/features/tags/mutations/prepend-tag-order';
import type { Color } from '@/theme/spectrum';
import { id as generateId } from '@instantdb/react-native';

const queueRecordCardRefresh = async ({
  recordId,
  tagId,
}: {
  recordId?: string;
  tagId: string;
}) => {
  if (!recordId) return false;

  try {
    await cardMutations.refreshRecordCards({ recordId, tagIds: [tagId] });
    return true;
  } catch {
    return false;
  }
};

const addRecordTag = async ({
  recordId,
  tagId,
}: {
  recordId?: string;
  tagId: string;
}) => {
  if (!recordId) return;
  const queued = await queueRecordCardRefresh({ recordId, tagId });
  if (!queued) return;
  await db.transact(db.tx.records[recordId].link({ tags: tagId }));
};

const removeRecordTag = async ({
  recordId,
  tagId,
}: {
  recordId?: string;
  tagId: string;
}) => {
  if (!recordId) return;
  const queued = await queueRecordCardRefresh({ recordId, tagId });
  if (!queued) return;
  await db.transact(db.tx.records[recordId].unlink({ tags: tagId }));
};

export const toggleRecordTag = async ({
  recordId,
  selected,
  tagId,
}: {
  recordId?: string;
  selected: boolean;
  tagId: string;
}) => {
  if (selected) {
    await addRecordTag({ recordId, tagId });
    return;
  }

  await removeRecordTag({ recordId, tagId });
};

export const createRecordTag = async ({
  color,
  id,
  logId,
  name,
  recordId,
  teamId,
}: {
  color: Color;
  id?: string;
  logId?: string;
  name: string;
  recordId?: string;
  teamId?: string;
}) => {
  if (!logId || !recordId || !teamId) return;
  const trimmedName = name.trim();
  const tagId = id ?? generateId();

  const orderTransactions = await getPrependTagOrderTransactions({
    logId,
    tagId,
    teamId,
    type: 'record',
  });

  await db.transact([
    db.tx.tags[tagId]
      .update({ color, name: trimmedName, order: 0, teamId, type: 'record' })
      .link({ logs: logId, team: teamId }),
    ...orderTransactions,
    db.tx.records[recordId].link({ tags: tagId }),
  ]);
};

export const createRecordTagDefinition = async ({
  color,
  id,
  logId,
  name,
  teamId,
}: {
  color: Color;
  id?: string;
  logId?: string;
  name: string;
  teamId?: string;
}) => {
  if (!logId || !teamId) return;
  const trimmedName = name.trim();
  if (!trimmedName) return;
  const tagId = id ?? generateId();

  const orderTransactions = await getPrependTagOrderTransactions({
    logId,
    tagId,
    teamId,
    type: 'record',
  });

  await db.transact([
    db.tx.tags[tagId]
      .update({ color, name: trimmedName, order: 0, teamId, type: 'record' })
      .link({ logs: logId, team: teamId }),
    ...orderTransactions,
  ]);
};
