import { type Db } from '@/api/middleware/db';
import { normalizeOrder } from '@/api/files/upload/metadata';
import type { LinkField } from '@/api/files/upload/types';

export const getNextAttachmentOrder = async ({
  db: dbClient,
  linkField,
  linkId,
}: {
  db: Db;
  linkField: LinkField;
  linkId: string;
}) => {
  if (linkField === 'record') {
    const { records } = await dbClient.query({
      records: {
        $: { fields: ['id'], where: { id: linkId } },
        files: { $: { fields: ['order'] } },
      },
    });

    return (
      (records[0]?.files ?? []).reduce(
        (max, file) => Math.max(max, normalizeOrder(file.order) ?? -1),
        -1
      ) + 1
    );
  }

  const { replies } = await dbClient.query({
    replies: {
      $: { fields: ['id'], where: { id: linkId } },
      files: { $: { fields: ['order'] } },
    },
  });

  return (
    (replies[0]?.files ?? []).reduce(
      (max, file) => Math.max(max, normalizeOrder(file.order) ?? -1),
      -1
    ) + 1
  );
};
