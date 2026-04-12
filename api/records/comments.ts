import { db } from '@/api/middleware/db';
import { deleteActivities } from '@/utilities/delete-activities';
import { canDeleteOwnOrManagedResource } from '@/utilities/permissions';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';

const app = new Hono<{ Bindings: CloudflareEnv }>();

app.delete('/:commentId', db({ asUser: true }), async (c) => {
  const commentId = c.req.param('commentId');
  const recordId = c.req.param('recordId');

  if (!commentId || !recordId) {
    throw new HTTPException(400, { message: 'Invalid request' });
  }

  const { comments } = await c.var.db.query({
    comments: {
      $: { where: { id: commentId } },
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
      media: {},
      activities: {},
    },
  });

  const comment = comments[0];
  if (!comment) return c.json({ success: true });
  const callerRole = comment.record?.log?.team?.roles?.[0]?.role;

  const canDelete =
    comment.record?.id === recordId &&
    canDeleteOwnOrManagedResource({
      actorRole: callerRole,
      isAuthor: comment.author?.user?.id === c.var.user.id,
    });

  if (!canDelete) {
    throw new HTTPException(403, { message: 'Forbidden' });
  }

  const r2Keys: string[] = [];

  for (const item of comment.media ?? []) {
    r2Keys.push(item.uri as string);
    if (item.previewUri) r2Keys.push(item.previewUri as string);
  }

  await c.var.db.transact(c.var.db.tx.comments[commentId].delete());

  await Promise.all([
    r2Keys.length ? c.env.R2.delete(r2Keys) : undefined,
    deleteActivities(c.env, comment.activities ?? []),
  ]);

  return c.json({ success: true });
});

export default app;
