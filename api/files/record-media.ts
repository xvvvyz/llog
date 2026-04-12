import { db } from '@/api/middleware/db';
import { canDeleteOwnOrManagedResource } from '@/utilities/permissions';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import * as upload from './upload';

const app = new Hono<{ Bindings: CloudflareEnv }>();

app.put(
  '/',
  upload.uploadLimit(upload.MAX_BYTES_BY_KIND.video),
  db({ asUser: true }),
  upload.mediaValidator,
  async (c) => {
    const recordId = c.req.param('recordId');

    if (!recordId) {
      throw new HTTPException(400, { message: 'Record not found' });
    }

    const { duration, file, mediaId, order } = c.req.valid('form');

    await upload.uploadMedia({
      db: c.var.db,
      duration,
      file,
      keyPrefix: `records/${recordId}`,
      linkField: 'record',
      linkId: recordId,
      media: c.env.MEDIA,
      mediaId,
      order,
      r2: c.env.R2,
      recordId,
    });

    return c.json({ success: true });
  }
);

app.delete('/:mediaId', db({ asUser: true }), async (c) => {
  const mediaId = c.req.param('mediaId');
  const recordId = c.req.param('recordId');
  if (!mediaId || !recordId) {
    throw new HTTPException(400, { message: 'Invalid request' });
  }

  const { media } = await c.var.db.query({
    media: {
      $: { where: { id: mediaId } },
      record: {
        author: { user: { $: { fields: ['id'] } } },
        log: {
          team: {
            roles: {
              $: {
                fields: ['role'] as ['role'],
                where: { userId: c.var.user.id },
              },
            },
          },
        },
      },
    },
  });

  const item = media[0];
  const callerRole = item?.record?.log?.team?.roles?.[0]?.role;

  const canDelete =
    item?.record?.id === recordId &&
    canDeleteOwnOrManagedResource({
      actorRole: callerRole,
      isAuthor: item?.record?.author?.user?.id === c.var.user.id,
    });

  if (!item?.id || !canDelete) {
    throw new HTTPException(403, { message: 'Forbidden' });
  }

  await c.var.db.transact(c.var.db.tx.media[mediaId].delete());

  await Promise.all([
    c.env.R2.delete(item.uri as string),
    item.previewUri ? c.env.R2.delete(item.previewUri as string) : undefined,
  ]);

  return c.json({ success: true });
});

export default app;
