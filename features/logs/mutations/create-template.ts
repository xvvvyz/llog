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
  name,
  order,
  teamId,
  text,
}: {
  id?: string;
  logId?: string;
  name: string;
  order?: number;
  teamId?: string;
  text: string;
}) => {
  if (!logId || !teamId) return;
  const templateId = id ?? generateId();
  const trimmedName = name.trim();
  const trimmedText = text.trim();
  if (!trimmedName || !trimmedText) return;

  return db.transact(
    db.tx.templates[templateId]
      .update({
        name: trimmedName,
        order: order ?? (await getNextTemplateOrder(logId)),
        teamId,
        text: trimmedText,
      })
      .link({ log: logId })
  );
};
