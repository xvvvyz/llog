import schema from '@/instant.schema';
import { db } from '@/middleware/db';
import { init } from '@instantdb/admin';
import { Hono } from 'hono';

const app = new Hono<{ Bindings: CloudflareEnv }>();

const deleteActivities = async (
  env: CloudflareEnv,
  activities: { id: string }[]
) => {
  if (!activities.length) return;

  const adminDb = init({
    adminToken: env.INSTANT_APP_ADMIN_TOKEN,
    appId: env.INSTANT_APP_ID,
    schema,
  });

  await adminDb.transact(
    activities.map((a) => adminDb.tx.activities[a.id].delete())
  );
};

app.delete('/:recordId', db({ asUser: true }), async (c) => {
  const { recordId } = c.req.param();

  const { records } = await c.var.db.query({
    records: {
      $: { where: { id: recordId } },
      media: {},
      comments: { media: {} },
      activities: {},
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

  await Promise.all([
    r2Keys.length ? c.env.R2.delete(r2Keys) : undefined,
    deleteActivities(c.env, record.activities ?? []),
  ]);

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
        activities: {},
      },
    });

    const comment = comments[0];
    if (!comment) return c.json({ success: true });

    const r2Keys: string[] = [];

    for (const item of comment.media ?? []) {
      r2Keys.push(item.uri as string);
      if (item.previewUri) r2Keys.push(item.previewUri as string);
    }

    await Promise.all([
      r2Keys.length ? c.env.R2.delete(r2Keys) : undefined,
      deleteActivities(c.env, comment.activities ?? []),
    ]);

    return c.json({ success: true });
  }
);

export default app;
