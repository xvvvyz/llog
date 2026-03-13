import { Role } from '@/enums/roles';
import { db } from '@/middleware/db';
import { zValidator } from '@hono/zod-validator';
import { id } from '@instantdb/admin';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod/v4';

const app = new Hono<{ Bindings: CloudflareEnv }>();

app.post(
  '/:teamId/invites',
  db({ asUser: true }),
  zValidator('json', z.object({ email: z.string().email(), role: z.string() })),
  async (c) => {
    const { teamId } = c.req.param();
    const { email: rawEmail, role } = c.req.valid('json');
    const email = rawEmail.toLowerCase();

    const validRoles = [Role.Owner, Role.Admin, Role.Recorder];

    if (!validRoles.includes(role as Role)) {
      throw new HTTPException(400, { message: 'Invalid role' });
    }

    const { roles: callerRoles } = await c.var.db.query({
      roles: {
        $: {
          where: {
            team: teamId,
            userId: c.var.user.id,
          },
        },
      },
    });

    const callerRole = callerRoles[0]?.role;

    if (callerRole !== Role.Owner && callerRole !== Role.Admin) {
      throw new HTTPException(403, { message: 'Forbidden' });
    }

    const { invites: existingInvites } = await c.var.db.query({
      invites: {
        $: { where: { email, team: teamId } },
      },
    });

    if (existingInvites.length) {
      throw new HTTPException(400, { message: 'Invite already exists' });
    }

    const { $users: users } = await c.var.db.query({
      $users: {
        $: { where: { email } },
        profile: {},
        roles: { $: { where: { team: teamId } } },
      },
    });

    const targetUser = users[0];

    if (targetUser) {
      if (targetUser.roles?.length) {
        throw new HTTPException(400, { message: 'User is already a member' });
      }
    }

    const { profiles } = await c.var.db.query({
      profiles: {
        $: { where: { user: c.var.user.id }, fields: ['id'] },
      },
    });

    const creatorProfileId = profiles[0]?.id;

    if (!creatorProfileId) {
      throw new HTTPException(400, { message: 'Profile not found' });
    }

    await c.var.db.transact(
      c.var.db.tx.invites[id()]
        .update({ email, role, teamId })
        .link({ team: teamId, creator: creatorProfileId })
    );

    return c.json({ status: 'invited' });
  }
);

app.get('/my-invites', db(), async (c) => {
  const token = c.req.header('Authorization')?.split(' ')[1] ?? '';
  const user = await c.var.db.auth.verifyToken(token);
  const email = user.email?.toLowerCase();

  if (!email) {
    return c.json({ invites: [] });
  }

  const { invites } = await c.var.db.query({
    invites: {
      $: { where: { email } },
      team: {},
    },
  });

  return c.json({ invites });
});

app.post('/invites/:inviteId/accept', db(), async (c) => {
  const token = c.req.header('Authorization')?.split(' ')[1] ?? '';
  const user = await c.var.db.auth.verifyToken(token);
  const { inviteId } = c.req.param();

  const { invites } = await c.var.db.query({
    invites: {
      $: { where: { id: inviteId } },
      team: { $: { fields: ['id'] } },
    },
  });

  const invite = invites[0];

  if (!invite) {
    throw new HTTPException(404, { message: 'Invite not found' });
  }

  if (user.email?.toLowerCase() !== invite.email.toLowerCase()) {
    throw new HTTPException(403, { message: 'Forbidden' });
  }

  const teamId = invite.team?.id;

  if (!teamId) {
    throw new HTTPException(400, { message: 'Invalid invite' });
  }

  await c.var.db.transact([
    c.var.db.tx.roles[id()]
      .update({
        adminId: invite.role !== Role.Recorder ? user.id : '',
        key: `${invite.role}_${user.id}_${teamId}`,
        role: invite.role,
        teamId,
        userId: user.id,
      })
      .link({ team: teamId, user: user.id }),
    c.var.db.tx.invites[inviteId].delete(),
  ]);

  return c.json({ status: 'joined', teamId });
});

app.post('/invites/:inviteId/decline', db(), async (c) => {
  const token = c.req.header('Authorization')?.split(' ')[1] ?? '';
  const user = await c.var.db.auth.verifyToken(token);
  const { inviteId } = c.req.param();

  const { invites } = await c.var.db.query({
    invites: {
      $: { where: { id: inviteId } },
    },
  });

  const invite = invites[0];

  if (!invite) {
    throw new HTTPException(404, { message: 'Invite not found' });
  }

  if (user.email?.toLowerCase() !== invite.email.toLowerCase()) {
    throw new HTTPException(403, { message: 'Forbidden' });
  }

  await c.var.db.transact(c.var.db.tx.invites[inviteId].delete());

  return c.json({ status: 'declined' });
});

app.post('/resolve-invites', db(), async (c) => {
  const token = c.req.header('Authorization')?.split(' ')[1] ?? '';
  const user = await c.var.db.auth.verifyToken(token);
  const email = user.email?.toLowerCase();

  if (!email) {
    return c.json({ joined: [] });
  }

  const { invites } = await c.var.db.query({
    invites: {
      $: { where: { email } },
      team: { $: { fields: ['id'] } },
    },
  });

  if (!invites.length) {
    return c.json({ joined: [] });
  }

  const txns = invites.flatMap((invite) => {
    const teamId = invite.team?.id;
    if (!teamId) return [];

    return [
      c.var.db.tx.roles[id()]
        .update({
          adminId: invite.role !== Role.Recorder ? user.id : '',
          key: `${invite.role}_${user.id}_${teamId}`,
          role: invite.role,
          teamId,
          userId: user.id,
        })
        .link({ team: teamId, user: user.id }),
      c.var.db.tx.invites[invite.id].delete(),
    ];
  });

  if (txns.length) {
    await c.var.db.transact(txns);
  }

  const joined = invites.map((inv) => inv.team?.id).filter(Boolean);
  return c.json({ joined });
});

export default app;
