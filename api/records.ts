import { db } from '@/middleware/db';
import { Hono } from 'hono';

const app = new Hono<{ Bindings: CloudflareEnv }>();

app.delete('/:recordId', db({ asUser: true }), async (c) => {
  const { recordId } = c.req.param();

  const { records } = await c.var.db.query({
    records: {
      $: { where: { id: recordId } },
      media: {},
      comments: { media: {} },
    },
  });

  const record = records[0];
  if (!record) return c.json({ success: true });

  const r2Keys: string[] = [];

  for (const item of record.media ?? []) {
    r2Keys.push(item.uri as string);
    if (item.previewUri) r2Keys.push(item.previewUri as string);
  }

  for (const comment of record.comments ?? []) {
    for (const item of comment.media ?? []) {
      r2Keys.push(item.uri as string);
      if (item.previewUri) r2Keys.push(item.previewUri as string);
    }
  }

  if (r2Keys.length) {
    await c.env.R2.delete(r2Keys);
  }

  return c.json({ success: true });
});

app.delete(
  '/:recordId/comments/:commentId',
  db({ asUser: true }),
  async (c) => {
    const { commentId } = c.req.param();

    const { comments } = await c.var.db.query({
      comments: {
        $: { where: { id: commentId } },
        media: {},
      },
    });

    const comment = comments[0];
    if (!comment) return c.json({ success: true });

    const r2Keys: string[] = [];

    for (const item of comment.media ?? []) {
      r2Keys.push(item.uri as string);
      if (item.previewUri) r2Keys.push(item.previewUri as string);
    }

    if (r2Keys.length) {
      await c.env.R2.delete(r2Keys);
    }

    return c.json({ success: true });
  }
);

export default app;
