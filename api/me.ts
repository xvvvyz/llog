import { db } from '@/middleware/db';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod/v4';

const app = new Hono();

app.put(
  '/avatar',
  db({ asUser: true }),
  zValidator('form', z.object({ file: z.instanceof(File) })),
  async (c) => {
    const file = c.req.valid('form').file;
    const key = `profiles/${c.var.user.id}/avatar`;

    if (!file.type.startsWith('image/')) {
      throw new HTTPException(400, { message: 'Invalid file format' });
    }

    const upload = await c.env.R2.put(key, file, {
      httpMetadata: { contentType: file.type },
    });

    const { profiles } = await c.var.db.query({
      profiles: { $: { fields: ['id'], where: { user: c.var.user.id } } },
    });

    const profile = profiles[0];

    if (!profile) {
      throw new HTTPException(400, { message: 'User has no profile' });
    }

    await c.var.db.transact(
      c.var.db.tx.profiles[profile.id].update({
        avatar: `${upload.key}?v=${upload.version}`,
      })
    );

    return c.json({ success: true });
  }
);

app.delete('/avatar', db({ asUser: true }), async (c) => {
  const { profiles } = await c.var.db.query({
    profiles: { $: { fields: ['avatar'], where: { user: c.var.user.id } } },
  });

  const profile = profiles[0];

  if (profile?.avatar) {
    await c.env.R2.delete(profile.avatar);

    await c.var.db.transact(
      c.var.db.tx.profiles[profile.id].update({ avatar: null })
    );
  }

  return c.json({ success: true });
});

export default app;
