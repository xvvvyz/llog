import { deleteActivities } from '@/api/activity/delete-activities';
import { deleteUnusedFileAssets } from '@/api/files/delete-file-assets';
import { db } from '@/api/middleware/db';
import { fileAssetQuery } from '@/domain/files/query';
import * as permissions from '@/domain/teams/permissions';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';

const app = new Hono<{ Bindings: CloudflareEnv }>();

app.delete('/:logId', db({ asUser: true }), async (c) => {
  const logId = c.req.param('logId');
  if (!logId) throw new HTTPException(400, { message: 'Invalid request' });

  const { logs } = await c.var.db.query({
    logs: {
      $: { where: { id: logId } },
      activities: {},
      team: {
        roles: { $: { fields: ['role'], where: { userId: c.var.user.id } } },
      },
      records: {
        files: fileAssetQuery,
        activities: {},
        replies: { files: fileAssetQuery, activities: {} },
      },
    },
  });

  const log = logs[0];
  if (!log) return c.json({ success: true });
  const callerRole = log.team?.roles?.[0]?.role;

  if (!permissions.canManageTeam(callerRole)) {
    throw new HTTPException(403, { message: 'Forbidden' });
  }

  const filesToDelete: Array<{
    assetKey?: string | null;
    uri?: string | null;
  }> = [];

  const activities = [...(log.activities ?? [])];

  for (const record of log.records ?? []) {
    activities.push(...(record.activities ?? []));

    for (const item of record.files ?? []) {
      filesToDelete.push(item);
    }

    for (const reply of record.replies ?? []) {
      activities.push(...(reply.activities ?? []));

      for (const item of reply.files ?? []) {
        filesToDelete.push(item);
      }
    }
  }

  await c.var.db.transact(c.var.db.tx.logs[logId].delete());

  await Promise.all([
    filesToDelete.length
      ? deleteUnusedFileAssets(c.env, filesToDelete)
      : undefined,
    deleteActivities(c.env, activities),
  ]);

  return c.json({ success: true });
});

export default app;
