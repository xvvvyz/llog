import { deleteUnusedMediaAssets } from '@/api/files/delete-media-assets';
import { auth, db } from '@/api/middleware/db';
import * as push from '@/api/push/web-push';
import { deleteActivities } from '@/features/activity/lib/delete-activities';
import * as permissions from '@/features/teams/lib/permissions';
import { zValidator } from '@hono/zod-validator';
import { id } from '@instantdb/admin';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod/v4';

const app = new Hono<{ Bindings: CloudflareEnv }>();

app.post(
  '/:recordId/replies/:replyId/publish',
  db(),
  auth(),
  zValidator('json', z.object({ text: z.string().max(10240) })),
  async (c) => {
    const user = c.var.user!;
    const replyId = c.req.param('replyId');
    const recordId = c.req.param('recordId');

    if (!replyId || !recordId) {
      throw new HTTPException(400, { message: 'Invalid request' });
    }

    const { text } = c.req.valid('json');

    const { replies } = await c.var.db.query({
      replies: {
        $: { where: { id: replyId } },
        author: {
          $: { fields: ['id', 'name'] },
          user: { $: { fields: ['id'] } },
        },
        media: { $: { fields: ['id'] } },
        links: { $: { fields: ['id'] } },
        record: {
          $: { fields: ['id'] },
          log: {
            $: { fields: ['id', 'name'] },
            profiles: {
              user: {
                $: { fields: ['id'] },
                subscriptions: {
                  $: { fields: ['id', 'endpoint', 'subscription'] },
                },
              },
            },
            team: {
              roles: {
                $: { fields: ['id', 'role', 'userId'] },
                user: {
                  $: { fields: ['id'] },
                  subscriptions: {
                    $: { fields: ['id', 'endpoint', 'subscription'] },
                  },
                },
              },
            },
          },
        },
      },
    });

    const reply = replies[0];

    if (!reply || reply.record?.id !== recordId) {
      throw new HTTPException(404, { message: 'Reply not found' });
    }

    const actorRole = reply.record?.log?.team?.roles?.find(
      (role) => role.userId === user.id
    )?.role;

    const isAuthor = reply.author?.user?.id === user.id;

    const isLogMember = !!reply.record?.log?.profiles?.some(
      (profile) => profile.user?.id === user.id
    );

    if (!isAuthor || (!permissions.canManageTeam(actorRole) && !isLogMember)) {
      throw new HTTPException(403, { message: 'Forbidden' });
    }

    if (!reply.isDraft) {
      throw new HTTPException(409, { message: 'Reply already published' });
    }

    const trimmedText = text.trim();

    const hasContent =
      !!trimmedText || !!reply.media?.length || !!reply.links?.length;

    if (
      !hasContent ||
      !reply.author?.id ||
      !reply.record?.log?.id ||
      !reply.teamId
    ) {
      throw new HTTPException(400, { message: 'Invalid reply draft' });
    }

    const now = new Date().toISOString();

    await c.var.db.transact([
      c.var.db.tx.replies[replyId].update({
        date: now,
        isDraft: false,
        text: trimmedText,
      }),
      c.var.db.tx.activities[id()]
        .update({ type: 'reply_posted', date: now, teamId: reply.teamId })
        .link({
          actor: reply.author.id,
          team: reply.teamId,
          record: recordId,
          reply: replyId,
          log: reply.record.log.id,
        }),
    ]);

    await push.sendPushNotifications(
      c.env,
      push.collectRecipientSubscriptions({
        actorUserId: user.id,
        logProfiles: reply.record.log.profiles,
        roles: reply.record.log.team?.roles,
      }),
      push.buildReplyNotification({
        authorName: reply.author.name,
        replyId,
        logName: reply.record.log.name,
        recordId,
        text: trimmedText,
      })
    );

    return c.json({ success: true });
  }
);

app.delete('/:recordId/replies/:replyId', db({ asUser: true }), async (c) => {
  const replyId = c.req.param('replyId');
  const recordId = c.req.param('recordId');

  if (!replyId || !recordId) {
    throw new HTTPException(400, { message: 'Invalid request' });
  }

  const { replies } = await c.var.db.query({
    replies: {
      $: { where: { id: replyId } },
      author: { user: { $: { fields: ['id'] } } },
      record: {
        $: { fields: ['id'] },
        log: {
          team: {
            roles: {
              $: { fields: ['role'], where: { userId: c.var.user.id } },
            },
          },
        },
      },
      media: {},
      activities: {},
    },
  });

  const reply = replies[0];
  if (!reply) return c.json({ success: true });
  const callerRole = reply.record?.log?.team?.roles?.[0]?.role;

  const canDelete =
    reply.record?.id === recordId &&
    permissions.canDeleteOwnOrManagedResource({
      actorRole: callerRole,
      isAuthor: reply.author?.user?.id === c.var.user.id,
    });

  if (!canDelete) throw new HTTPException(403, { message: 'Forbidden' });

  const mediaToDelete: Array<{
    assetKey?: string | null;
    uri?: string | null;
  }> = [];

  for (const item of reply.media ?? []) {
    mediaToDelete.push(item);
  }

  await c.var.db.transact(c.var.db.tx.replies[replyId].delete());

  await Promise.all([
    mediaToDelete.length
      ? deleteUnusedMediaAssets(c.env, mediaToDelete)
      : undefined,
    deleteActivities(c.env, reply.activities ?? []),
  ]);

  return c.json({ success: true });
});

export default app;
