import { auth, db } from '@/api/middleware/db';
import * as permissions from '@/features/teams/lib/permissions';
import { Role } from '@/features/teams/types/role';
import { zValidator } from '@hono/zod-validator';
import { id } from '@instantdb/admin';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { nanoid } from 'nanoid';
import { z } from 'zod/v4';

const app = new Hono<{ Bindings: CloudflareEnv }>();

app.post(
  '/:teamId/invite-links',
  db(),
  auth(),
  zValidator(
    'json',
    z.object({
      role: z.enum([Role.Admin, Role.Member]),
      logIds: z.array(z.string()).optional().default([]),
    })
  ),
  async (c) => {
    const user = c.var.user!;
    const teamId = c.req.param('teamId');

    if (!teamId) {
      throw new HTTPException(400, { message: 'Invalid request' });
    }

    const { role, logIds } = c.req.valid('json');

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

    if (!permissions.canManageTeam(callerRole)) {
      throw new HTTPException(403, { message: 'Forbidden' });
    }

    const creatorProfileId = profiles[0]?.id;

    if (!creatorProfileId) {
      throw new HTTPException(400, { message: 'Profile not found' });
    }

    const token = nanoid(8);
    const linkId = id();

    const linkTx = c.var.db.tx.invites[linkId]
      .update({ token, role, teamId })
      .link({
        team: teamId,
        creator: creatorProfileId,
        ...(logIds.length ? { logs: logIds } : {}),
      });

    await c.var.db.transact(linkTx);
    return c.json({ token });
  }
);

app.delete('/:teamId/invite-links/:linkId', db({ asUser: true }), async (c) => {
  const { linkId } = c.req.param();
  await c.var.db.transact(c.var.db.tx.invites[linkId].delete());
  return c.json({ status: 'deleted' });
});

export default app;
