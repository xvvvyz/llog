import { db } from '@/api/middleware/db';
import * as p from '@/utilities/permissions';
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
    const replyId = c.req.param('replyId');
    const recordId = c.req.param('recordId');

    if (!replyId || !recordId) {
      throw new HTTPException(400, { message: 'Reply not found' });
    }

    const { duration, file, mediaId, order } = c.req.valid('form');

    const { replies } = await c.var.db.query({
      replies: {
        $: {
          fields: ['id'] as ['id'],
          where: { id: replyId, record: recordId },
        },
      },
    });

    if (!replies[0]?.id) {
      throw new HTTPException(400, { message: 'Reply not found' });
    }

    await upload.uploadMedia({
      db: c.var.db,
      duration,
      file,
      keyPrefix: `replies/${replyId}`,
      linkField: 'reply',
      linkId: replyId,
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
  const replyId = c.req.param('replyId');
  const mediaId = c.req.param('mediaId');
  const recordId = c.req.param('recordId');

  if (!replyId || !mediaId || !recordId) {
    throw new HTTPException(400, { message: 'Invalid request' });
  }

  const { media } = await c.var.db.query({
    media: {
      $: { where: { id: mediaId } },
      reply: {
        $: { fields: ['id'] as ['id'] },
        author: { user: { $: { fields: ['id'] } } },
        record: {
          $: { fields: ['id'] as ['id'] },
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
    },
  });

  const item = media[0];
  const callerRole = item?.reply?.record?.log?.team?.roles?.[0]?.role;

  const canDelete =
    item?.reply?.id === replyId &&
    item?.reply?.record?.id === recordId &&
    p.canDeleteOwnOrManagedResource({
      actorRole: callerRole,
      isAuthor: item?.reply?.author?.user?.id === c.var.user.id,
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
