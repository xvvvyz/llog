import { apiOrThrow } from '@/lib/api';

export const finalizeRecordCopy = async ({
  date,
  id,
  logIds,
}: {
  date?: string | number;
  id?: string;
  logIds: string[];
}) => {
  if (!id || logIds.length === 0) return;

  return apiOrThrow(
    `/records/${id}/finalize-copy`,
    {
      body: JSON.stringify({ date, logIds }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    },
    'Failed to copy record'
  );
};
