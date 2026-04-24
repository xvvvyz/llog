import { auth, db } from '@/api/middleware/db';
import { removeMember } from '@/api/teams/member-actions';
import * as permissions from '@/features/teams/lib/permissions';
import { Role } from '@/features/teams/types/role';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod/v4';

const app = new Hono<{ Bindings: CloudflareEnv }>();

app.patch(
  '/:teamId/members/:roleId',
  db(),
  auth(),
  zValidator('json', z.object({ role: z.enum([Role.Admin, Role.Member]) })),
  async (c) => {
    const user = c.var.user!;
    const teamId = c.req.param('teamId');
    const roleId = c.req.param('roleId');

    if (!teamId || !roleId) {
      throw new HTTPException(400, { message: 'Invalid request' });
    }

    const { role: nextRole } = c.req.valid('json');

    const [{ roles: callerRoles }, { roles: targetRoles }, { logs }] =
      await Promise.all([
        c.var.db.query({
          roles: { $: { where: { team: teamId, userId: user.id } } },
        }),
        c.var.db.query({
          roles: {
            $: { where: { id: roleId, team: teamId } },
            user: { profile: { $: { fields: ['id'] } } },
          },
        }),
        c.var.db.query({
          logs: { $: { where: { team: teamId }, fields: ['id'] } },
        }),
      ]);

    const actorRole = callerRoles[0]?.role;
    const targetRole = targetRoles[0];

    if (!actorRole || !targetRole) {
      throw new HTTPException(400, { message: 'Invalid request' });
    }

    if (
      !permissions.canChangeTeamMemberRole({
        actorRole,
        isSelf: targetRole.userId === user.id,
        nextRole,
        targetRole: targetRole.role,
      })
    ) {
      throw new HTTPException(403, { message: 'Forbidden' });
    }

    const tx: any[] = [
      c.var.db.tx.roles[roleId].update({
        key: `${nextRole}_${targetRole.userId}_${teamId}`,
        role: nextRole,
        teamId,
        userId: targetRole.userId,
      }),
    ];

    const profileId = targetRole.user?.profile?.id;

    if (profileId && targetRole.role !== nextRole) {
      const logIds = logs.map((log) => log.id);

      if (
        permissions.isManagedRole(nextRole) &&
        !permissions.isManagedRole(targetRole.role)
      ) {
        tx.push(
          ...logIds.map((logId) =>
            c.var.db.tx.logs[logId].link({ profiles: profileId })
          )
        );
      }

      if (
        !permissions.isManagedRole(nextRole) &&
        permissions.isManagedRole(targetRole.role)
      ) {
        tx.push(
          ...logIds.map((logId) =>
            c.var.db.tx.logs[logId].unlink({ profiles: profileId })
          )
        );
      }
    }

    await c.var.db.transact(tx);
    return c.json({ status: 'updated' });
  }
);

app.delete('/:teamId/members/:roleId', db(), auth(), async (c) => {
  const user = c.var.user!;
  const teamId = c.req.param('teamId');
  const roleId = c.req.param('roleId');

  if (!teamId || !roleId) {
    throw new HTTPException(400, { message: 'Invalid request' });
  }

  const [{ roles: callerRoles }, { roles: targetRoles }] = await Promise.all([
    c.var.db.query({
      roles: { $: { where: { team: teamId, userId: user.id } } },
    }),
    c.var.db.query({
      roles: {
        $: { where: { id: roleId, team: teamId } },
        user: { profile: { $: { fields: ['id'] } } },
      },
    }),
  ]);

  const callerRole = callerRoles[0]?.role;
  const targetRole = targetRoles[0];

  if (!callerRole || !targetRole) {
    throw new HTTPException(400, { message: 'Invalid request' });
  }

  if (
    !permissions.canRemoveTeamMember({
      actorRole: callerRole,
      isSelf: targetRole.userId === user.id,
      targetRole: targetRole.role,
    })
  ) {
    throw new HTTPException(403, { message: 'Forbidden' });
  }

  const profileId = targetRole.user?.profile?.id;

  if (!profileId) {
    throw new HTTPException(400, { message: 'Profile not found' });
  }

  await removeMember(c.var.db, roleId, profileId, teamId);
  return c.json({ status: 'removed' });
});

export default app;
