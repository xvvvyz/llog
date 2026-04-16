import { apiOrThrow } from '@/utilities/api';

export const publishComment = async ({
  id: commentId,
  text,
  recordId,
}: {
  id?: string;
  text: string;
  recordId?: string;
}) => {
  if (!commentId || !recordId) return;

  return apiOrThrow(
    `/records/${recordId}/comments/${commentId}/publish`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    },
    'Failed to publish comment'
  );
};
