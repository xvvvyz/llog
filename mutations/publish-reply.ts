import { apiOrThrow } from '@/lib/api';

export const publishReply = async ({
  id: replyId,
  text,
  recordId,
}: {
  id?: string;
  text: string;
  recordId?: string;
}) => {
  if (!replyId || !recordId) return;

  return apiOrThrow(
    `/records/${recordId}/replies/${replyId}/publish`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    },
    'Failed to publish reply'
  );
};
