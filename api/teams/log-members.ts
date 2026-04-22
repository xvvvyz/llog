import { auth, db } from '@/api/middleware/db';
import * as p from '@/lib/permissions';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod/v4';

const app = new Hono<{ Bindings: CloudflareEnv }>();

app.put(
  '/:teamId/logs/:logId/members/:roleId',
  db(),
  auth(),
  zValidator('json', z.object({ selected: z.boolean() })),
  async (c) => {
    const user = c.var.user!;
    const logId = c.req.param('logId');
    const roleId = c.req.param('roleId');
    const teamId = c.req.param('teamId');

    if (!logId || !roleId || !teamId) {
      throw new HTTPException(400, { message: 'Invalid request' });
    }

    const { selected } = c.req.valid('json');

    const [{ roles: callerRoles }, { logs }, { roles: targetRoles }] =
      await Promise.all([
        c.var.db.query({
          roles: { $: { where: { team: teamId, userId: user.id } } },
        }),
        c.var.db.query({
          logs: { $: { where: { id: logId, team: teamId }, fields: ['id'] } },
        }),
        c.var.db.query({
          roles: {
            $: { where: { id: roleId, team: teamId } },
            user: { profile: { $: { fields: ['id'] } } },
          },
        }),
      ]);

    const actorRole = callerRoles[0]?.role;
    const targetRole = targetRoles[0];

    if (!actorRole || !targetRole || !logs[0]?.id) {
      throw new HTTPException(400, { message: 'Invalid request' });
    }

    if (
      !p.canManageLogMember({
        actorRole,
        targetRole: targetRole.role,
      })
    ) {
      throw new HTTPException(403, { message: 'Forbidden' });
    }

    const profileId = targetRole.user?.profile?.id;

    if (!profileId) {
      throw new HTTPException(400, { message: 'Profile not found' });
    }

    await c.var.db.transact(
      c.var.db.tx.logs[logId][selected ? 'link' : 'unlink']({
        profiles: profileId,
      })
    );

    return c.json({ status: selected ? 'added' : 'removed' });
  }
);

export default app;
