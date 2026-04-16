import { apiOrThrow } from '@/utilities/api';

export const publishRecord = async ({ id: recordId }: { id?: string }) => {
  if (!recordId) return;

  return apiOrThrow(
    `/records/${recordId}/publish`,
    { method: 'POST' },
    'Failed to publish record'
  );
};
