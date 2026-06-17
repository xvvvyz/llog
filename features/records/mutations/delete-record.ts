import { apiOrThrow } from '@/lib/api';
import * as outboxStore from '@/features/offline/outbox-store';
import * as recordCache from '@/features/records/queries/record-cache';

const clearDeletedRecordLocalState = async (id: string) => {
  await outboxStore.ensureOutboxHydrated();
  await outboxStore.clearCompletedSubmission(`record:${id}`);
  outboxStore.clearQueuedDraft({ parentId: id, parentType: 'record' });
  outboxStore.clearQueuedRecordPin({ recordId: id });
  recordCache.deleteCachedRecord(id);
};

export const deleteRecord = async ({ id }: { id: string }) => {
  const result = await apiOrThrow(
    `/records/${id}`,
    { method: 'DELETE' },
    'Failed to delete record'
  );

  await clearDeletedRecordLocalState(id);
  return result;
};
