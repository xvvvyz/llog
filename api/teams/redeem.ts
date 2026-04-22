import { auth, db } from '@/api/middleware/db';
import { memberJoinedActivity } from '@/api/teams/helpers';
import * as permissions from '@/features/teams/lib/permissions';
import { Role } from '@/features/teams/types/role';
import { id } from '@instantdb/admin';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';

const app = new Hono<{ Bindings: CloudflareEnv }>();

app.get('/:token', db(), async (c) => {
  const { token } = c.req.param();

  const { invites } = await c.var.db.query({
    invites: {
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

  const link = invites[0];

  if (!link) {
    throw new HTTPException(404, { message: 'Invite link not found' });
  }

  const adminMembers = (link.team?.roles ?? [])
    .filter((role) => permissions.isManagedRole(role.role))
    .map((role) => role.user?.profile)
    .filter(Boolean)
    .map((profile) => ({
      avatarSeedId: profile!.avatarSeedId,
      id: profile!.id,
      name: profile!.name,
      image: profile!.image?.uri,
    }));

  const logMembers = (link.logs ?? []).flatMap((log) =>
    (log.profiles ?? []).map((profile) => ({
      avatarSeedId: profile.avatarSeedId,
      id: profile.id,
      name: profile.name,
      image: profile.image?.uri,
    }))
  );

  const members =
    link.role === Role.Member ? [...adminMembers, ...logMembers] : adminMembers;

  const uniqueMembers = [
    ...new Map(members.map((member) => [member.id, member])).values(),
  ];

  return c.json({
    isValid: true,
    teamId: link.team?.id,
    teamName: link.team?.name,
    role: link.role,
    logNames: link.logs?.map((log) => log.name) ?? [],
    members: uniqueMembers,
  });
});

app.post('/:token/redeem', db(), auth(), async (c) => {
  const user = c.var.user!;
  const { token } = c.req.param();

  const { invites } = await c.var.db.query({
    invites: {
      $: { where: { token } },
      team: { $: { fields: ['id'] } },
      logs: { $: { fields: ['id'] } },
    },
  });

  const link = invites[0];

  if (!link) {
    throw new HTTPException(404, { message: 'Invite link not found' });
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
  const logIds = link.logs?.map((log) => log.id) ?? [];

  const desiredRole = permissions.getInviteRedemptionRole({
    currentRole: existingRole?.role,
    invitedRole: link.role,
  });

  const targetLogIds =
    actorId && permissions.isManagedRole(desiredRole)
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

export default app;
