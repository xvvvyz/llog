import { deleteActivities } from '@/api/activity/delete-activities';
import * as cardActions from '@/api/cards/card-actions';
import { deleteUnusedFileAssets } from '@/api/files/delete-file-assets';
import { auth, createAdminDb, db } from '@/api/middleware/db';
import { notificationRecipientLogQuery } from '@/api/push/query';
import * as push from '@/api/push/web-push';
import { fileAssetQuery } from '@/domain/files/query';
import * as recordPublish from '@/domain/records/publish';
import * as permissions from '@/domain/teams/permissions';
import { zValidator } from '@hono/zod-validator';
import { id } from '@instantdb/admin';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod/v4';

const app = new Hono<{ Bindings: CloudflareEnv }>();

const offlineDraftReplaySchema = z.object({
  authorId: z.string().min(1),
  date: z.union([z.string(), z.number()]).optional(),
  teamId: z.string().min(1),
  text: z.string().max(10240),
});

app.put(
  '/:recordId/replies/:replyId/offline-draft-replay',
  db(),
  auth(),
  zValidator('json', offlineDraftReplaySchema),
  async (c) => {
    const user = c.var.user!;
    const replyId = c.req.param('replyId');
    const recordId = c.req.param('recordId');

    if (!replyId || !recordId) {
      throw new HTTPException(400, { message: 'Invalid request' });
    }

    const { authorId, date, teamId, text } = c.req.valid('json');

    const { profiles, records, replies } = await c.var.db.query({
      profiles: {
        $: { fields: ['id' as const], where: { id: authorId } },
        user: { $: { fields: ['id' as const] } },
      },
      records: {
        $: {
          fields: ['id' as const, 'teamId' as const],
          where: { id: recordId },
        },
        log: {
          $: { fields: ['id' as const] },
          team: {
            roles: {
              $: { fields: ['role' as const], where: { userId: user.id } },
            },
          },
          profiles: { user: { $: { fields: ['id' as const] } } },
        },
      },
      replies: {
        $: {
          fields: ['id' as const, 'isDraft' as const],
          where: { id: replyId },
        },
        author: {
          $: { fields: ['id' as const] },
          user: { $: { fields: ['id' as const] } },
        },
        record: { $: { fields: ['id' as const] } },
      },
    });

    const profile = profiles[0];
    const record = records[0];
    const reply = replies[0];
    const actorRole = record?.log?.team?.roles?.[0]?.role;

    const isLogMember = !!record?.log?.profiles?.some(
      (profile) => profile.user?.id === user.id
    );

    if (
      !profile?.id ||
      profile.user?.id !== user.id ||
      !record?.id ||
      record.teamId !== teamId ||
      (!permissions.canManageTeam(actorRole) && !isLogMember)
    ) {
      throw new HTTPException(403, { message: 'Forbidden' });
    }

    if (reply?.id) {
      if (reply.isDraft !== true) {
        throw new HTTPException(409, { message: 'Reply already published' });
      }

      if (reply.author?.user?.id !== user.id || reply.record?.id !== recordId) {
        throw new HTTPException(403, { message: 'Forbidden' });
      }
    }

    await c.var.db.transact(
      c.var.db.tx.replies[replyId]
        .update(
          {
            date: date ?? new Date().toISOString(),
            isDraft: true,
            teamId,
            text,
          },
          { upsert: true }
        )
        .link({ author: authorId, record: recordId })
    );

    return c.json({ success: true });
  }
);

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
    const trimmedText = text.trim();

    const { replies } = await c.var.db.query({
      replies: {
        $: { where: { id: replyId } },
        author: {
          $: { fields: ['id', 'name'] },
          user: { $: { fields: ['id'] } },
        },
        files: { $: { fields: ['id'] } },
        links: { $: { fields: ['id'] } },
        record: {
          $: { fields: ['id'] },
          log: {
            $: { fields: ['id', 'name'] },
            ...notificationRecipientLogQuery,
          },
          tags: { $: { fields: ['id' as const] } },
        },
      },
    });

    const reply = replies[0];

    if (!reply) {
      const { records, profiles } = await c.var.db.query({
        profiles: { $: { fields: ['id', 'name'], where: { user: user.id } } },
        records: {
          $: { fields: ['id', 'teamId'], where: { id: recordId } },
          log: {
            $: { fields: ['id', 'name'] },
            ...notificationRecipientLogQuery,
          },
          tags: { $: { fields: ['id' as const] } },
        },
      });

      const record = records[0];
      const profile = profiles[0];

      if (!record?.id) {
        throw new HTTPException(404, { message: 'Reply not found' });
      }

      const actorRole = record.log?.team?.roles?.find(
        (role) => role.userId === user.id
      )?.role;

      const isLogMember = !!record.log?.profiles?.some(
        (profile) => profile.user?.id === user.id
      );

      if (!permissions.canManageTeam(actorRole) && !isLogMember) {
        throw new HTTPException(403, { message: 'Forbidden' });
      }

      if (!trimmedText || !profile?.id || !record.log?.id || !record.teamId) {
        throw new HTTPException(400, { message: 'Invalid reply draft' });
      }

      const now = new Date().toISOString();

      await c.var.db.transact(
        recordPublish.buildCreatePublishedReplyTransactions({
          activityId: id(),
          authorId: profile.id,
          db: c.var.db,
          logId: record.log.id,
          now,
          recordId,
          replyId,
          teamId: record.teamId,
          text: trimmedText,
        })
      );

      await cardActions.queuePublishedRecordCardRefreshes({
        dbClient: c.var.db,
        env: c.env,
        logId: record.log.id,
        recordTagIds: record.tags?.map((tag) => tag.id) ?? [],
      });

      await push.sendPushNotifications(
        c.env,
        push.collectRecipientSubscriptions({
          actorUserId: user.id,
          logProfiles: record.log.profiles,
          roles: record.log.team?.roles,
        }),
        push.buildReplyNotification({
          authorName: profile.name,
          replyId,
          logName: record.log.name,
          recordId,
          text: trimmedText,
        }),
        { staleSubscriptionDb: c.var.db }
      );

      return c.json({ success: true });
    }

    if (reply.record?.id !== recordId) {
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

    const hasContent =
      !!trimmedText || !!reply.files?.length || !!reply.links?.length;

    if (
      !hasContent ||
      !reply.author?.id ||
      !reply.record?.log?.id ||
      !reply.teamId
    ) {
      throw new HTTPException(400, { message: 'Invalid reply draft' });
    }

    const now = new Date().toISOString();

    await c.var.db.transact(
      recordPublish.buildPublishDraftReplyTransactions({
        activityDate: now,
        activityId: id(),
        actorId: reply.author.id,
        contentDate: reply.date ?? now,
        db: c.var.db,
        logId: reply.record.log.id,
        recordId,
        replyId,
        teamId: reply.teamId,
        text: trimmedText,
      })
    );

    await cardActions.queuePublishedRecordCardRefreshes({
      dbClient: c.var.db,
      env: c.env,
      logId: reply.record.log.id,
      recordTagIds: reply.record.tags?.map((tag) => tag.id) ?? [],
    });

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
      }),
      { staleSubscriptionDb: c.var.db }
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
          $: { fields: ['id' as const] },
          team: {
            roles: {
              $: { fields: ['role'], where: { userId: c.var.user.id } },
            },
          },
        },
        tags: { $: { fields: ['id' as const] } },
      },
      files: fileAssetQuery,
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
  const filesToDelete: { assetKey?: string | null; uri?: string | null }[] = [];

  for (const item of reply.files ?? []) {
    filesToDelete.push(item);
  }

  await c.var.db.transact(c.var.db.tx.replies[replyId].delete());
  const logId = reply.record?.log?.id;
  const recordTagIds = reply.record?.tags?.map((tag) => tag.id) ?? [];

  await Promise.all([
    filesToDelete.length
      ? deleteUnusedFileAssets(c.env, filesToDelete)
      : undefined,
    deleteActivities(c.env, reply.activities ?? []),
    !reply.isDraft && logId && recordTagIds.length
      ? cardActions.queuePublishedRecordCardRefreshes({
          dbClient: createAdminDb(c.env),
          env: c.env,
          logId,
          recordTagIds,
        })
      : undefined,
  ]);

  return c.json({ success: true });
});

export default app;
