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
    activities.map((activity) => adminDb.tx.activities[activity.id].delete())
  );
};

app.delete('/:logId', db({ asUser: true }), async (c) => {
  const { logId } = c.req.param();

  const { logs } = await c.var.db.query({
    logs: {
      $: { where: { id: logId } },
      activities: {},
      team: {
        roles: {
          $: {
            fields: ['role'] as ['role'],
            where: { userId: c.var.user.id },
          },
        },
      },
      records: {
        media: {},
        activities: {},
        comments: { media: {}, activities: {} },
      },
    },
  });

  const log = logs[0];

  if (!log) {
    return c.json({ success: true });
  }

  const callerRole = log.team?.roles?.[0]?.role;

  if (!isManagedRole(callerRole)) {
    throw new HTTPException(403, { message: 'Forbidden' });
  }

  const r2Keys: string[] = [];
  const activities = [...(log.activities ?? [])];

  for (const record of log.records ?? []) {
    activities.push(...(record.activities ?? []));

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
  }

  await c.var.db.transact(c.var.db.tx.logs[logId].delete());

  await Promise.all([
    r2Keys.length ? c.env.R2.delete(r2Keys) : undefined,
    deleteActivities(c.env, activities),
  ]);

  return c.json({ success: true });
});

export default app;
