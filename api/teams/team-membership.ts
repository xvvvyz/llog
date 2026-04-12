import { auth, db } from '@/api/middleware/db';
import { Role } from '@/types/role';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { removeMember } from './shared';

const app = new Hono<{ Bindings: CloudflareEnv }>();

app.post('/leave', db(), auth(), async (c) => {
  const user = c.var.user!;
  const teamId = c.req.param('teamId');

  if (!teamId) {
    throw new HTTPException(400, { message: 'Invalid request' });
  }

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

export default app;
