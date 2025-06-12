import { updateDataPrompt } from '@/agent/prompts/update-data';
import { updateDataSchema } from '@/agent/schemas/update-data';
import schema from '@/instant.schema';
import { createAIFunction } from '@agentic/core';
import { init, InstantAPIError, TransactionChunk } from '@instantdb/admin';

export const updateData = (db: ReturnType<typeof init<typeof schema>>) =>
  createAIFunction({
    name: 'updateData',
    description: updateDataPrompt,
    inputSchema: updateDataSchema,
    execute: async ({ transactions }) => {
      const txs = JSON.parse(transactions) as {
        action: 'update' | 'merge' | 'delete' | 'link' | 'unlink';
        data?: Record<string, unknown>;
        id: string;
        links?: Record<string, unknown>;
        namespace: keyof typeof schema.entities;
      }[];

      try {
        return await db.transact(
          txs.reduce<
            TransactionChunk<typeof schema, keyof typeof schema.entities>[]
          >((acc, t) => {
            const payload = t.data ?? t.links;
            const entity = db.tx[t.namespace][t.id];

            let tx =
              t.action === 'delete'
                ? entity.delete()
                : payload
                  ? entity[t.action](payload)
                  : null;

            if (!tx) return acc;
            if (t.links) tx = tx.link(t.links);
            acc.push(tx);
            return acc;
          }, [])
        );
      } catch (error) {
        if (error instanceof InstantAPIError) return error.body;
        if (error instanceof Error) return error.message;
      }
    },
  });
