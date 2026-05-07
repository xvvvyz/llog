import { apiOrThrow } from '@/lib/api';

export const detectEntryMusic = async ({
  recordId,
  replyId,
}: {
  recordId: string;
  replyId?: string;
}) => {
  const path = replyId
    ? `/files/records/${recordId}/replies/${replyId}/files/detect-music`
    : `/files/records/${recordId}/files/detect-music`;

  await apiOrThrow(path, { method: 'POST' }, 'Failed to detect music');
};
