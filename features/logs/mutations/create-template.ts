import { db } from '@/lib/db';
import { id as generateId } from '@instantdb/react-native';

const getNextTemplateOrder = async (logId: string) => {
  const { data } = await db.queryOnce({
    templates: {
      $: { fields: ['order'], order: { order: 'desc' }, where: { log: logId } },
    },
  });

  return (
    (data.templates ?? []).reduce(
      (max, template) => Math.max(max, template.order ?? -1),
      -1
    ) + 1
  );
};

export const createTemplate = async ({
  id,
  logId,
  order,
  tagIds,
  teamId,
  text,
}: {
  id?: string;
  logId?: string;
  order?: number;
  tagIds?: string[];
  teamId?: string;
  text: string;
}) => {
  if (!logId || !teamId) return;
  const templateId = id ?? generateId();
  const trimmedText = text.trim();
  if (!trimmedText) return;
  const uniqueTagIds = [...new Set(tagIds ?? [])];

  return db.transact([
    db.tx.templates[templateId]
      .update({
        order: order ?? (await getNextTemplateOrder(logId)),
        teamId,
        text: trimmedText,
      })
      .link({ log: logId }),
    ...uniqueTagIds.map((tagId) =>
      db.tx.templates[templateId].link({ tags: tagId })
    ),
  ]);
};
