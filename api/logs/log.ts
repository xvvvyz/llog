import { db } from '@/api/middleware/db';
import { deleteActivities } from '@/utilities/delete-activities';
import * as p from '@/utilities/permissions';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';

const app = new Hono<{ Bindings: CloudflareEnv }>();

app.delete('/', db({ asUser: true }), async (c) => {
  const logId = c.req.param('logId');

  if (!logId) {
    throw new HTTPException(400, { message: 'Invalid request' });
  }

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
        replies: { media: {}, activities: {} },
      },
    },
  });

  const log = logs[0];

  if (!log) {
    return c.json({ success: true });
  }

  const callerRole = log.team?.roles?.[0]?.role;

  if (!p.canManageTeam(callerRole)) {
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

    for (const reply of record.replies ?? []) {
      activities.push(...(reply.activities ?? []));

      for (const item of reply.media ?? []) {
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
