import { apiOrThrow } from '@/lib/api';

export const replayReplyDraft = async ({
  authorId,
  date,
  id,
  recordId,
  teamId,
  text,
}: {
  authorId?: string;
  date?: string | number;
  id?: string;
  recordId?: string;
  teamId?: string;
  text: string;
}) => {
  if (!authorId || !id || !recordId || !teamId) return;

  await apiOrThrow(
    `/records/${recordId}/replies/${id}/offline-draft-replay`,
    {
      body: JSON.stringify({ authorId, date, teamId, text }),
      headers: { 'Content-Type': 'application/json' },
      method: 'PUT',
    },
    'Failed to replay reply draft'
  );
};
