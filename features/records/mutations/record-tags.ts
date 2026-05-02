import { db } from '@/lib/db';
import type { Color } from '@/theme/spectrum';
import { id as generateId } from '@instantdb/react-native';

export const addRecordTag = async ({
  recordId,
  tagId,
}: {
  recordId?: string;
  tagId: string;
}) => {
  if (!recordId) return;
  return db.transact(db.tx.records[recordId].link({ tags: tagId }));
};

export const removeRecordTag = async ({
  recordId,
  tagId,
}: {
  recordId?: string;
  tagId: string;
}) => {
  if (!recordId) return;
  return db.transact(db.tx.records[recordId].unlink({ tags: tagId }));
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
  return selected
    ? addRecordTag({ recordId, tagId })
    : removeRecordTag({ recordId, tagId });
};

export const createRecordTag = async ({
  color,
  id,
  logId,
  name,
  order,
  recordId,
  teamId,
}: {
  color?: Color | null;
  id?: string;
  logId?: string;
  name: string;
  order?: number;
  recordId?: string;
  teamId?: string;
}) => {
  if (!logId || !recordId || !teamId) return;
  const trimmedName = name.trim();
  const tagId = id ?? generateId();

  return db.transact([
    db.tx.tags[tagId]
      .update({
        ...(color !== undefined && { color }),
        name: trimmedName,
        order: order ?? -Date.now(),
        teamId,
        type: 'record',
      })
      .link({ logs: logId, team: teamId }),
    db.tx.records[recordId].link({ tags: tagId }),
  ]);
};
