import { apiOrThrow } from '@/lib/api';
import * as outboxStore from '@/features/offline/outbox-store';
import * as recordDeletions from '@/features/records/queries/record-deletions';
import * as recordCache from '@/features/records/queries/record-cache';

const clearDeletedRecordLocalState = async (id: string) => {
  await outboxStore.ensureOutboxHydrated();
  await outboxStore.clearCompletedSubmission(`record:${id}`);
  outboxStore.clearQueuedDraft({ parentId: id, parentType: 'record' });
  outboxStore.clearQueuedRecordPin({ recordId: id });
  recordCache.deleteCachedRecord(id);
};

export const deleteRecord = async ({
  id,
  logId,
}: {
  id: string;
  logId?: string;
}) => {
  recordCache.deleteCachedRecord(id);
  if (logId) recordDeletions.hideLocallyDeletedRecord({ id, logId });
  let result: Response;

  try {
    result = await apiOrThrow(
      `/records/${id}`,
      { method: 'DELETE' },
      'Failed to delete record'
    );
  } catch (error) {
    if (logId) recordDeletions.restoreLocallyDeletedRecord(id);
    throw error;
  }

  await clearDeletedRecordLocalState(id);
  return result;
};
