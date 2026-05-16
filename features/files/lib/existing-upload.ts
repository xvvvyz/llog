import { visibleFileQuery } from '@/domain/files/query';
import type { QueuedParent } from '@/features/offline/types';
import { db } from '@/lib/db';

export const getExistingFileForQueuedParent = async ({
  fileId,
  parent,
}: {
  fileId?: string;
  parent?: QueuedParent;
}) => {
  if (!fileId || !parent) return;

  const result = await db.queryOnce({
    files: {
      $: { ...visibleFileQuery.$, where: { id: fileId } },
      record: { $: { fields: ['id' as const] } },
      reply: { $: { fields: ['id' as const] } },
    },
  });

  const file = result?.data?.files?.[0];
  if (!file?.id) return;

  const linkedToParent =
    parent.parentType === 'record'
      ? file.record?.id === parent.parentId
      : file.reply?.id === parent.parentId;

  return linkedToParent ? file : undefined;
};

export const isExistingFileIdError = (error: unknown) =>
  error instanceof Error && /file id already exists/i.test(error.message);
