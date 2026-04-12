import { db } from '@/api/middleware/db';
import { canDeleteOwnOrManagedResource } from '@/utilities/permissions';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import {
  MAX_BYTES_BY_KIND,
  mediaValidator,
  uploadLimit,
  uploadMedia,
} from './shared';

const app = new Hono<{ Bindings: CloudflareEnv }>();

app.put(
  '/',
  uploadLimit(MAX_BYTES_BY_KIND.video),
  db({ asUser: true }),
  mediaValidator,
  async (c) => {
    const commentId = c.req.param('commentId');
    const recordId = c.req.param('recordId');

    if (!commentId || !recordId) {
      throw new HTTPException(400, { message: 'Comment not found' });
    }

    const { duration, file, mediaId, order } = c.req.valid('form');

    const { comments } = await c.var.db.query({
      comments: {
        $: {
          fields: ['id'] as ['id'],
          where: { id: commentId, record: recordId },
        },
      },
    });

    if (!comments[0]?.id) {
      throw new HTTPException(400, { message: 'Comment not found' });
    }

    await uploadMedia({
      db: c.var.db,
      duration,
      file,
      keyPrefix: `comments/${commentId}`,
      linkField: 'comment',
      linkId: commentId,
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
  const commentId = c.req.param('commentId');
  const mediaId = c.req.param('mediaId');
  const recordId = c.req.param('recordId');

  if (!commentId || !mediaId || !recordId) {
    throw new HTTPException(400, { message: 'Invalid request' });
  }

  const { media } = await c.var.db.query({
    media: {
      $: { where: { id: mediaId } },
      comment: {
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
  const callerRole = item?.comment?.record?.log?.team?.roles?.[0]?.role;

  const canDelete =
    item?.comment?.id === commentId &&
    item?.comment?.record?.id === recordId &&
    canDeleteOwnOrManagedResource({
      actorRole: callerRole,
      isAuthor: item?.comment?.author?.user?.id === c.var.user.id,
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
