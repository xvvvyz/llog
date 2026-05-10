import { deleteUnusedFileAssets } from '@/api/files/delete-file-assets';
import { auth, db } from '@/api/middleware/db';
import { removeMember } from '@/api/teams/member-actions';
import { fileAssetQuery } from '@/domain/files/query';
import * as permissions from '@/domain/teams/permissions';
import { Role } from '@/domain/teams/role';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';

const app = new Hono<{ Bindings: CloudflareEnv }>();

app.post('/:teamId/leave', db(), auth(), async (c) => {
  const user = c.var.user!;
  const teamId = c.req.param('teamId');
  if (!teamId) throw new HTTPException(400, { message: 'Invalid request' });

  const [{ roles }, { profiles }] = await Promise.all([
    c.var.db.query({
      roles: { $: { where: { team: teamId, userId: user.id } } },
    }),
    c.var.db.query({
      profiles: { $: { where: { user: user.id }, fields: ['id'] } },
    }),
  ]);

  const role = roles[0];
  const profileId = profiles[0]?.id;

  if (!role || !profileId) {
    throw new HTTPException(400, { message: 'Not a team member' });
  }

  if (role.role === Role.Owner) {
    throw new HTTPException(400, { message: 'Owner cannot leave the team' });
  }

  await removeMember(c.var.db, role.id, profileId, teamId);
  return c.json({ status: 'left' });
});

app.delete('/:teamId', db({ asUser: true }), async (c) => {
  const teamId = c.req.param('teamId');
  if (!teamId) throw new HTTPException(400, { message: 'Invalid request' });

  const { teams } = await c.var.db.query({
    teams: {
      $: { where: { id: teamId } },
      image: {},
      roles: { $: { fields: ['role'], where: { userId: c.var.user.id } } },
      logs: {
        records: { files: fileAssetQuery, replies: { files: fileAssetQuery } },
      },
    },
  });

  const team = teams[0];
  if (!team) return c.json({ success: true });

  if (!permissions.isOwnerRole(team.roles?.[0]?.role)) {
    throw new HTTPException(403, { message: 'Forbidden' });
  }

  const filesToDelete: { assetKey?: string | null; uri?: string | null }[] = [];
  if (team.image) filesToDelete.push(team.image);

  for (const log of team.logs ?? []) {
    for (const record of log.records ?? []) {
      for (const item of record.files ?? []) {
        filesToDelete.push(item);
      }

      for (const reply of record.replies ?? []) {
        for (const item of reply.files ?? []) {
          filesToDelete.push(item);
        }
      }
    }
  }

  await c.var.db.transact(c.var.db.tx.teams[teamId].delete());
  if (filesToDelete.length) await deleteUnusedFileAssets(c.env, filesToDelete);
  return c.json({ success: true });
});

export default app;
