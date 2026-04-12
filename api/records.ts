import { isManagedRole } from '@/enums/roles';
import { createAdminDb, db } from '@/middleware/db';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';

const app = new Hono<{ Bindings: CloudflareEnv }>();

const deleteActivities = async (
  env: CloudflareEnv,
  activities: { id: string }[]
) => {
  if (!activities.length) return;

  const adminDb = createAdminDb(env);

  await adminDb.transact(
    activities.map((a) => adminDb.tx.activities[a.id].delete())
  );
};

app.delete('/:recordId', db({ asUser: true }), async (c) => {
  const { recordId } = c.req.param();

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

  const canDelete =
    record.author?.user?.id === c.var.user.id || isManagedRole(callerRole);

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

app.delete(
  '/:recordId/comments/:commentId',
  db({ asUser: true }),
  async (c) => {
    const { commentId, recordId } = c.req.param();

    const { comments } = await c.var.db.query({
      comments: {
        $: { where: { id: commentId } },
        author: { user: { $: { fields: ['id'] } } },
        record: {
          $: { fields: ['id'] as ['id'] },
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
        },
        media: {},
        activities: {},
      },
    });

    const comment = comments[0];
    if (!comment) return c.json({ success: true });
    const callerRole = comment.record?.log?.team?.roles?.[0]?.role;

    const canDelete =
      comment.record?.id === recordId &&
      (comment.author?.user?.id === c.var.user.id || isManagedRole(callerRole));

    if (!canDelete) {
      throw new HTTPException(403, { message: 'Forbidden' });
    }

    const r2Keys: string[] = [];

    for (const item of comment.media ?? []) {
      r2Keys.push(item.uri as string);
      if (item.previewUri) r2Keys.push(item.previewUri as string);
    }

    await c.var.db.transact(c.var.db.tx.comments[commentId].delete());

    await Promise.all([
      r2Keys.length ? c.env.R2.delete(r2Keys) : undefined,
      deleteActivities(c.env, comment.activities ?? []),
    ]);

    return c.json({ success: true });
  }
);

export default app;
