import { apiOrThrow } from '@/lib/api';

type RecordCopyDraftResponse = {
  draftRecordId: string;
  targetLogIds: string[];
};

export const createRecordCopyDraft = async ({
  id,
  logIds,
}: {
  id?: string;
  logIds: string[];
}) => {
  if (!id || logIds.length === 0) return;

  const response = await apiOrThrow(
    `/records/${id}/copy-draft`,
    {
      body: JSON.stringify({ logIds }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    },
    'Failed to create copy draft'
  );

  return response.json() as Promise<RecordCopyDraftResponse>;
};
