import { Role } from '@/enums/roles';
import { Db, db } from '@/middleware/db';
import { zValidator } from '@hono/zod-validator';
import { id } from '@instantdb/admin';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { nanoid } from 'nanoid';
import { z } from 'zod/v4';

const app = new Hono<{ Bindings: CloudflareEnv }>();

const memberJoinedActivity = (
  db: Db,
  actorId: string | undefined,
  teamId: string
) =>
  actorId
    ? [
        db.tx.activities[id()]
          .update({
            type: 'member_joined',
            date: new Date().toISOString(),
            teamId,
          })
          .link({ actor: actorId, team: teamId }),
      ]
    : [];

const isManagedRole = (role?: string) =>
  role === Role.Owner || role === Role.Admin;

const removeMember = async (
  db: Db,
  roleId: string,
  profileId: string,
  teamId: string
) => {
  const { logs } = await db.query({
    logs: {
      $: { where: { team: teamId } },
      profiles: { $: { where: { id: profileId } } },
    },
  });

  const memberLogs = logs.filter((l) => l.profiles.length > 0);

  await db.transact([
    db.tx.roles[roleId].delete(),
    ...memberLogs.map((l) => db.tx.profiles[profileId].unlink({ logs: l.id })),
    db.tx.activities[id()]
      .update({
        type: 'member_left',
        date: new Date().toISOString(),
        teamId,
      })
      .link({ actor: profileId, team: teamId }),
  ]);
};

const generateToken = () => nanoid(8);

app.post(
  '/:teamId/invite-links',
  db(),
  zValidator(
    'json',
    z.object({
      role: z.enum([Role.Admin, Role.Member]),
      logIds: z.array(z.string()).optional().default([]),
      expiresAt: z.number().optional(),
    })
  ),
  async (c) => {
    const authToken = c.req.header('Authorization')?.split(' ')[1] ?? '';
    const user = await c.var.db.auth.verifyToken(authToken);
    const { teamId } = c.req.param();
    const { role, logIds, expiresAt } = c.req.valid('json');

    const [{ roles: callerRoles }, { profiles }] = await Promise.all([
      c.var.db.query({
        roles: {
          $: { where: { team: teamId, userId: user.id } },
        },
      }),
      c.var.db.query({
        profiles: {
          $: { where: { user: user.id }, fields: ['id'] },
        },
      }),
    ]);

    const callerRole = callerRoles[0]?.role;

    if (callerRole !== Role.Owner && callerRole !== Role.Admin) {
      throw new HTTPException(403, { message: 'Forbidden' });
    }

    const creatorProfileId = profiles[0]?.id;

    if (!creatorProfileId) {
      throw new HTTPException(400, { message: 'Profile not found' });
    }

    const token = generateToken();
    const linkId = id();

    const linkTx = c.var.db.tx.inviteLinks[linkId]
      .update({ token, role, teamId, expiresAt })
      .link({
        team: teamId,
        creator: creatorProfileId,
        ...(logIds.length ? { logs: logIds } : {}),
      });

    await c.var.db.transact(linkTx);
    return c.json({ token });
  }
);

app.get('/invite-links/:token', db(), async (c) => {
  const { token } = c.req.param();

  const { inviteLinks } = await c.var.db.query({
    inviteLinks: {
      $: { where: { token } },
      team: {
        $: { fields: ['name'] },
        roles: {
          user: { profile: { image: {} } },
        },
      },
      logs: {
        $: { fields: ['name'] },
        profiles: { image: {} },
      },
    },
  });

  const link = inviteLinks[0];

  if (!link) {
    throw new HTTPException(404, { message: 'Invite link not found' });
  }

  const now = Date.now();

  if (link.expiresAt && link.expiresAt < now) {
    return c.json({ isValid: false, reason: 'expired' });
  }

  const adminMembers = (link.team?.roles ?? [])
    .filter((r) => r.role === Role.Owner || r.role === Role.Admin)
    .map((r) => r.user?.profile)
    .filter(Boolean)
    .map((p) => ({ id: p!.id, name: p!.name, image: p!.image?.uri }));

  const logMembers = (link.logs ?? []).flatMap((l) =>
    (l.profiles ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      image: p.image?.uri,
    }))
  );

  const members =
    link.role === Role.Member ? [...adminMembers, ...logMembers] : adminMembers;

  const uniqueMembers = [...new Map(members.map((m) => [m.id, m])).values()];

  return c.json({
    isValid: true,
    teamId: link.team?.id,
    teamName: link.team?.name,
    role: link.role,
    logNames: link.logs?.map((l) => l.name) ?? [],
    members: uniqueMembers,
  });
});

app.post('/invite-links/:token/redeem', db(), async (c) => {
  const authToken = c.req.header('Authorization')?.split(' ')[1] ?? '';
  const user = await c.var.db.auth.verifyToken(authToken);
  const { token } = c.req.param();

  const { inviteLinks } = await c.var.db.query({
    inviteLinks: {
      $: { where: { token } },
      team: { $: { fields: ['id'] } },
      logs: { $: { fields: ['id'] } },
    },
  });

  const link = inviteLinks[0];

  if (!link) {
    throw new HTTPException(404, { message: 'Invite link not found' });
  }

  const now = Date.now();

  if (link.expiresAt && link.expiresAt < now) {
    throw new HTTPException(400, { message: 'Invite link has expired' });
  }

  const teamId = link.team?.id;

  if (!teamId) {
    throw new HTTPException(400, { message: 'Invalid invite link' });
  }

  const [{ roles: existingRoles }, { profiles }] = await Promise.all([
    c.var.db.query({
      roles: { $: { where: { team: teamId, userId: user.id } } },
    }),
    c.var.db.query({
      profiles: { $: { where: { user: user.id }, fields: ['id'] } },
    }),
  ]);

  const actorId = profiles[0]?.id;
  const existingRole = existingRoles[0];
  const logIds = link.logs?.map((l) => l.id) ?? [];

  const desiredRole =
    existingRole?.role === Role.Owner
      ? Role.Owner
      : link.role === Role.Admin
        ? Role.Admin
        : existingRole?.role;

  const targetLogIds =
    actorId && isManagedRole(desiredRole)
      ? (
          await c.var.db.query({
            logs: {
              $: { where: { team: teamId }, fields: ['id'] },
            },
          })
        ).logs.map((log) => log.id)
      : logIds;

  if (existingRole) {
    const tx: any[] = [];

    if (desiredRole && desiredRole !== existingRole.role) {
      tx.push(
        c.var.db.tx.roles[existingRole.id].update({
          key: `${desiredRole}_${user.id}_${teamId}`,
          role: desiredRole,
          teamId,
          userId: user.id,
        })
      );
    }

    if (actorId && targetLogIds.length) {
      tx.push(
        ...targetLogIds.map((logId) =>
          c.var.db.tx.profiles[actorId].link({ logs: logId })
        )
      );
    }

    if (tx.length) {
      await c.var.db.transact(tx);
    }

    return c.json({
      status: desiredRole !== existingRole.role ? 'role_updated' : 'logs_added',
      teamId,
    });
  }

  await c.var.db.transact([
    c.var.db.tx.roles[id()]
      .update({
        key: `${link.role}_${user.id}_${teamId}`,
        role: link.role,
        teamId,
        userId: user.id,
      })
      .link({ team: teamId, user: user.id }),
    ...(actorId && targetLogIds.length
      ? targetLogIds.map((logId) =>
          c.var.db.tx.profiles[actorId].link({ logs: logId })
        )
      : []),
    ...memberJoinedActivity(c.var.db, actorId, teamId),
  ]);

  return c.json({ status: 'joined', teamId });
});

app.delete('/:teamId/invite-links/:linkId', db({ asUser: true }), async (c) => {
  const { linkId } = c.req.param();
  await c.var.db.transact(c.var.db.tx.inviteLinks[linkId].delete());
  return c.json({ status: 'deleted' });
});

app.post('/:teamId/leave', db(), async (c) => {
  const authToken = c.req.header('Authorization')?.split(' ')[1] ?? '';
  const user = await c.var.db.auth.verifyToken(authToken);
  const { teamId } = c.req.param();

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

app.delete('/:teamId/members/:roleId', db(), async (c) => {
  const authToken = c.req.header('Authorization')?.split(' ')[1] ?? '';
  const user = await c.var.db.auth.verifyToken(authToken);
  const { teamId, roleId } = c.req.param();

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

  const canRemove =
    callerRole === Role.Owner ||
    (callerRole === Role.Admin && targetRole.role !== Role.Owner);

  if (!canRemove) {
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
