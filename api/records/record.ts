import { db } from '@/api/middleware/db';
import { deleteActivities } from '@/utilities/delete-activities';
import { canDeleteOwnOrManagedResource } from '@/utilities/permissions';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';

const app = new Hono<{ Bindings: CloudflareEnv }>();

app.delete('/', db({ asUser: true }), async (c) => {
  const recordId = c.req.param('recordId');

  if (!recordId) {
    throw new HTTPException(400, { message: 'Invalid request' });
  }

  const { records } = await c.var.db.query({
    records: {
      $: { where: { id: recordId } },
      author: { user: { $: { fields: ['id'] } } },
      log: {
        team: {
          roles: {
            $: {
              fields: ['role'] as ['role'],
              where: { userId: c.var.user.id },
            },
          },
        },
      },
      media: {},
      comments: { media: {}, activities: {} },
      activities: {},
    },
  });

  const record = records[0];
  if (!record) return c.json({ success: true });
  const callerRole = record.log?.team?.roles?.[0]?.role;

  const canDelete = canDeleteOwnOrManagedResource({
    actorRole: callerRole,
    isAuthor: record.author?.user?.id === c.var.user.id,
  });

  if (!canDelete) {
    throw new HTTPException(403, { message: 'Forbidden' });
  }

  const r2Keys: string[] = [];
  const activities = [...(record.activities ?? [])];

  for (const item of record.media ?? []) {
    r2Keys.push(item.uri as string);
    if (item.previewUri) r2Keys.push(item.previewUri as string);
  }

  for (const comment of record.comments ?? []) {
    activities.push(...(comment.activities ?? []));

    for (const item of comment.media ?? []) {
      r2Keys.push(item.uri as string);
      if (item.previewUri) r2Keys.push(item.previewUri as string);
    }
  }

  await c.var.db.transact(c.var.db.tx.records[recordId].delete());

  await Promise.all([
    r2Keys.length ? c.env.R2.delete(r2Keys) : undefined,
    deleteActivities(c.env, activities),
  ]);

  return c.json({ success: true });
});

export default app;
