import { db } from '@/middleware/db';
import { Hono } from 'hono';

const app = new Hono<{ Bindings: CloudflareEnv }>();

app.delete('/:logId', db({ asUser: true }), async (c) => {
  const { logId } = c.req.param();

  const { records } = await c.var.db.query({
    records: {
      $: { where: { log: logId } },
      media: {},
      comments: { media: {} },
    },
  });

  const r2Keys: string[] = [];

  for (const record of records) {
    for (const item of record.media ?? []) {
      r2Keys.push(item.uri as string);
    }

    for (const comment of record.comments ?? []) {
      for (const item of comment.media ?? []) {
        r2Keys.push(item.uri as string);
      }
    }
  }

  if (r2Keys.length) {
    await c.env.R2.delete(r2Keys);
  }

  return c.json({ success: true });
});

export default app;
