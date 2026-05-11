import * as logTemplates from '@/domain/logs/templates';
import { db } from '@/lib/db';
import { id as generateId } from '@instantdb/react-native';

const loadNextTemplateOrder = async (logId: string) => {
  const { data } = await db.queryOnce({
    templates: {
      $: { fields: ['order'], order: { order: 'desc' }, where: { log: logId } },
    },
  });

  return logTemplates.getNextTemplateOrder(data.templates ?? []);
};

export const createTemplate = async ({
  id,
  logId,
  tagIds,
  teamId,
  text,
}: {
  id?: string;
  logId?: string;
  tagIds?: string[];
  teamId?: string;
  text: string;
}) => {
  if (!logId || !teamId) return;
  const templateId = id ?? generateId();
  const trimmedText = text.trim();
  if (!trimmedText) return;
  const uniqueTagIds = logTemplates.uniqueTemplateTagIds(tagIds);

  return db.transact([
    db.tx.templates[templateId]
      .update({
        order: await loadNextTemplateOrder(logId),
        teamId,
        text: trimmedText,
      })
      .link({ log: logId }),
    ...uniqueTagIds.map((tagId) =>
      db.tx.templates[templateId].link({ tags: tagId })
    ),
  ]);
};
