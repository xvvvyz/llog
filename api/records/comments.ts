import { auth, db } from '@/api/middleware/db';
import * as push from '@/api/push/helpers';
import { deleteActivities } from '@/utilities/delete-activities';
import * as p from '@/utilities/permissions';
import { zValidator } from '@hono/zod-validator';
import { id } from '@instantdb/admin';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod/v4';

const app = new Hono<{ Bindings: CloudflareEnv }>();

app.post(
  '/:commentId/publish',
  db(),
  auth(),
  zValidator(
    'json',
    z.object({
      text: z.string().max(10240),
    })
  ),
  async (c) => {
    const user = c.var.user!;
    const commentId = c.req.param('commentId');
    const recordId = c.req.param('recordId');

    if (!commentId || !recordId) {
      throw new HTTPException(400, { message: 'Invalid request' });
    }

    const { text } = c.req.valid('json');

    const { comments } = await c.var.db.query({
      comments: {
        $: { where: { id: commentId } },
        author: {
          $: { fields: ['id', 'name'] as ['id', 'name'] },
          user: { $: { fields: ['id'] as ['id'] } },
        },
        media: { $: { fields: ['id'] as ['id'] } },
        record: {
          $: { fields: ['id'] as ['id'] },
          log: {
            $: { fields: ['id', 'name'] as ['id', 'name'] },
            profiles: {
              user: {
                $: { fields: ['id'] as ['id'] },
                pushSubscriptions: {
                  $: {
                    fields: ['id', 'endpoint', 'subscription'] as [
                      'id',
                      'endpoint',
                      'subscription',
                    ],
                  },
                },
              },
            },
            team: {
              roles: {
                $: {
                  fields: ['id', 'role', 'userId'] as ['id', 'role', 'userId'],
                },
                user: {
                  $: { fields: ['id'] as ['id'] },
                  pushSubscriptions: {
                    $: {
                      fields: ['id', 'endpoint', 'subscription'] as [
                        'id',
                        'endpoint',
                        'subscription',
                      ],
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    const comment = comments[0];

    if (!comment || comment.record?.id !== recordId) {
      throw new HTTPException(404, { message: 'Comment not found' });
    }

    const actorRole = comment.record?.log?.team?.roles?.find(
      (role) => role.userId === user.id
    )?.role;

    const isAuthor = comment.author?.user?.id === user.id;

    const isLogMember = !!comment.record?.log?.profiles?.some(
      (profile) => profile.user?.id === user.id
    );

    if (!isAuthor || (!p.canManageTeam(actorRole) && !isLogMember)) {
      throw new HTTPException(403, { message: 'Forbidden' });
    }

    if (!comment.isDraft) {
      throw new HTTPException(409, { message: 'Comment already published' });
    }

    const trimmedText = text.trim();
    const hasContent = !!trimmedText || !!comment.media?.length;

    if (
      !hasContent ||
      !comment.author?.id ||
      !comment.record?.log?.id ||
      !comment.teamId
    ) {
      throw new HTTPException(400, { message: 'Invalid comment draft' });
    }

    const now = new Date().toISOString();

    await c.var.db.transact([
      c.var.db.tx.comments[commentId].update({
        date: now,
        isDraft: false,
        text: trimmedText,
      }),
      c.var.db.tx.activities[id()]
        .update({
          type: 'comment_posted',
          date: now,
          teamId: comment.teamId,
        })
        .link({
          actor: comment.author.id,
          team: comment.teamId,
          record: recordId,
          comment: commentId,
          log: comment.record.log.id,
        }),
    ]);

    await push.sendPushNotifications(
      c.env,
      push.collectRecipientSubscriptions({
        actorUserId: user.id,
        logProfiles: comment.record.log.profiles,
        roles: comment.record.log.team?.roles,
      }),
      push.buildCommentNotification({
        authorName: comment.author.name,
        commentId,
        logName: comment.record.log.name,
        recordId,
        text: trimmedText,
      })
    );

    return c.json({ success: true });
  }
);

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
    p.canDeleteOwnOrManagedResource({
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
