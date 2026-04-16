import { db } from '@/api/middleware/db';
import { fileLike } from '@/types/file-like';
import * as p from '@/utilities/permissions';
import { zValidator } from '@hono/zod-validator';
import { id } from '@instantdb/admin';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod/v4';
import * as upload from './upload';

const queryTeamWithImageAndRole = (teamId: string, userId: string) => ({
  roles: {
    $: { where: { team: teamId, userId } },
  },
  teams: {
    $: { fields: ['id'] as ['id'], where: { id: teamId } },
    image: {},
  },
});

const app = new Hono<{ Bindings: CloudflareEnv }>();

app.put(
  '/',
  upload.uploadLimit(upload.MAX_BYTES_BY_KIND.image),
  db({ asUser: true }),
  zValidator('form', z.object({ file: fileLike })),
  async (c) => {
    const teamId = c.req.param('teamId');

    if (!teamId) {
      throw new HTTPException(400, { message: 'Team not found' });
    }

    const file = upload.requireUploadedFile(c.req.valid('form').file);
    upload.validateUpload(file, ['image']);

    const result = await c.var.db.query(
      queryTeamWithImageAndRole(teamId, c.var.user.id)
    );

    const team = result.teams?.[0];
    const callerRole = result.roles?.[0]?.role;

    if (!team?.id) {
      throw new HTTPException(404, { message: 'Team not found' });
    }

    if (!p.canManageTeam(callerRole)) {
      throw new HTTPException(403, { message: 'Forbidden' });
    }

    if (team.image) {
      await c.env.R2.delete(team.image.uri as string);
      await c.var.db.transact(c.var.db.tx.media[team.image.id].delete());
    }

    const mediaId = id();

    const stored = await c.env.R2.put(
      `teams/${teamId}/media/${mediaId}`,
      file,
      { httpMetadata: { contentType: file.type } }
    );

    await c.var.db.transact(
      c.var.db.tx.media[mediaId]
        .update({ teamId, type: 'image', uri: stored.key })
        .link({ team: teamId })
    );

    return c.json({ success: true });
  }
);

app.delete('/', db({ asUser: true }), async (c) => {
  const teamId = c.req.param('teamId');

  if (!teamId) {
    throw new HTTPException(400, { message: 'Team not found' });
  }

  const result = await c.var.db.query(
    queryTeamWithImageAndRole(teamId, c.var.user.id)
  );

  const team = result.teams?.[0];
  const callerRole = result.roles?.[0]?.role;

  if (!team?.id) {
    throw new HTTPException(404, { message: 'Team not found' });
  }

  if (!p.canManageTeam(callerRole)) {
    throw new HTTPException(403, { message: 'Forbidden' });
  }

  if (team.image) {
    await c.var.db.transact(c.var.db.tx.media[team.image.id].delete());
    await c.env.R2.delete(team.image.uri as string);
  }

  return c.json({ success: true });
});

export default app;
