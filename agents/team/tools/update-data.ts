import { updateDataPrompt } from '@/agents/team/prompts/update-data';
import { updateDataValidation } from '@/agents/team/validations/update-data';
import schema from '@/instant.schema';
import { Type } from '@google/genai';
import { init, TransactionChunk } from '@instantdb/admin';

export const tool = {
  name: 'updateData',
  description: updateDataPrompt,
  parameters: {
    type: Type.OBJECT,
    properties: {
      transactions: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            action: { type: Type.STRING },
            data: { type: Type.OBJECT },
            id: { type: Type.STRING },
            links: { type: Type.OBJECT },
            namespace: { type: Type.STRING },
          },
          required: ['namespace', 'id', 'action'],
        },
      },
    },
    required: ['transactions'],
  },
};

export const run = async (
  db: ReturnType<typeof init<typeof schema>>,
  transactions: unknown
) =>
  db.transact(
    updateDataValidation(transactions).reduce<
      TransactionChunk<typeof schema, keyof typeof schema.entities>[]
    >((acc, t) => {
      const payload = t.data ?? t.links;
      if (!payload) return acc;
      const namespace = t.namespace;
      const action = t.action;
      let tx = db.tx[namespace][t.id][action](payload);
      if (t.data && t.links) tx = tx.link(t.links);
      acc.push(tx);
      return acc;
    }, [])
  );
