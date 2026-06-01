import { deleteActivities } from '@/api/activity/delete-activities';
import { deleteUnusedFileAssets } from '@/api/files/delete-file-assets';
import { db } from '@/api/middleware/db';
import { fileAssetQuery } from '@/domain/files/query';
import * as permissions from '@/domain/teams/permissions';
import { Role } from '@/domain/teams/role';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import * as inviteLink from '@/domain/invites/invite-link';

const app = new Hono<{ Bindings: CloudflareEnv }>();
type LogDeleteInvite = inviteLink.InviteLogScope & { id?: string };

export const getLogDeleteInviteIds = (
  logId: string,
  invites: readonly LogDeleteInvite[]
) => [
  ...new Set(
    invites
      .filter((invite) => {
        if (!invite.id || invite.role !== Role.Member) return false;
        const logIds = inviteLink.getInviteLogIds(invite);
        return logIds.length === 1 && logIds[0] === logId;
      })
      .map((invite) => invite.id as string)
  ),
];

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
      invites: {
        $: { fields: ['id', 'role'] },
        logs: { $: { fields: ['id'] } },
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

  const filesToDelete: { assetKey?: string | null; uri?: string | null }[] = [];
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

  const inviteIdsToDelete = getLogDeleteInviteIds(logId, log.invites ?? []);

  await c.var.db.transact([
    ...inviteIdsToDelete.map((inviteId) =>
      c.var.db.tx.invites[inviteId].delete()
    ),
    c.var.db.tx.logs[logId].delete(),
  ]);

  await Promise.all([
    filesToDelete.length
      ? deleteUnusedFileAssets(c.env, filesToDelete)
      : undefined,
    deleteActivities(c.env, activities),
  ]);

  return c.json({ success: true });
});

export default app;
