import { apiOrThrow } from '@/lib/api';

export const copyRecord = async ({
  id,
  logIds,
}: {
  id?: string;
  logIds: string[];
}) => {
  if (!id || logIds.length === 0) return;

  return apiOrThrow(
    `/records/${id}/copy`,
    {
      body: JSON.stringify({ logIds }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    },
    'Failed to copy record'
  );
};
