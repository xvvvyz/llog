import { apiOrThrow } from '@/lib/api';

export const transcribeEntryAudio = async ({
  recordId,
  replyId,
}: {
  recordId: string;
  replyId?: string;
}) => {
  const path = replyId
    ? `/files/records/${recordId}/replies/${replyId}/files/transcribe`
    : `/files/records/${recordId}/files/transcribe`;

  await apiOrThrow(path, { method: 'POST' }, 'Failed to transcribe audio');
};
