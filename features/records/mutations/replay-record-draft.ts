import { apiOrThrow } from '@/lib/api';

export const replayRecordDraft = async ({
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
  if (!authorId || !id || !logId || !teamId) return;

  await apiOrThrow(
    `/records/${id}/offline-draft-replay`,
    {
      body: JSON.stringify({
        authorId,
        date,
        isPinned,
        logId,
        tagIds,
        teamId,
        text,
      }),
      headers: { 'Content-Type': 'application/json' },
      method: 'PUT',
    },
    'Failed to replay record draft'
  );
};
