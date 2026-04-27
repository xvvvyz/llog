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

app.post('/:recordId/publish', db(), auth(), async (c) => {
  const user = c.var.user!;
  const recordId = c.req.param('recordId');
  if (!recordId) throw new HTTPException(400, { message: 'Invalid request' });

  const { records } = await c.var.db.query({
    records: {
      $: { where: { id: recordId } },
      author: {
        $: { fields: ['id', 'name'] },
        user: { $: { fields: ['id'] } },
      },
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
      media: { $: { fields: ['id'] } },
      links: { $: { fields: ['id'] } },
    },
  });

  const record = records[0];
  if (!record) throw new HTTPException(404, { message: 'Record not found' });

  const actorRole = record.log?.team?.roles?.find(
    (role) => role.userId === user.id
  )?.role;

  const isAuthor = record.author?.user?.id === user.id;

  const isLogMember = !!record.log?.profiles?.some(
    (profile) => profile.user?.id === user.id
  );

  if (!isAuthor || (!permissions.canManageTeam(actorRole) && !isLogMember)) {
    throw new HTTPException(403, { message: 'Forbidden' });
  }

  if (!record.isDraft) {
    throw new HTTPException(409, { message: 'Record already published' });
  }

  const trimmedText = record.text?.trim() ?? '';

  const hasContent =
    !!trimmedText || !!record.media?.length || !!record.links?.length;

  if (!hasContent || !record.log?.id || !record.teamId || !record.author?.id) {
    throw new HTTPException(400, { message: 'Invalid record draft' });
  }

  const now = new Date().toISOString();

  await c.var.db.transact([
    c.var.db.tx.records[recordId].update({
      date: now,
      isDraft: false,
      text: trimmedText,
    }),
    c.var.db.tx.activities[id()]
      .update({ type: 'record_published', date: now, teamId: record.teamId })
      .link({
        actor: record.author.id,
        team: record.teamId,
        record: recordId,
        log: record.log.id,
      }),
  ]);

  await push.sendPushNotifications(
    c.env,
    push.collectRecipientSubscriptions({
      actorUserId: user.id,
      logProfiles: record.log.profiles,
      roles: record.log.team?.roles,
    }),
    push.buildRecordNotification({
      authorName: record.author.name,
      logName: record.log.name,
      recordId,
      text: trimmedText,
    })
  );

  return c.json({ success: true });
});

app.post(
  '/:recordId/copy',
  db(),
  auth(),
  zValidator('json', z.object({ logIds: z.array(z.string()).min(1).max(100) })),
  async (c) => {
    const user = c.var.user!;
    const recordId = c.req.param('recordId');
    if (!recordId) throw new HTTPException(400, { message: 'Invalid request' });
    const { logIds } = c.req.valid('json');
    const targetLogIds = [...new Set(logIds.map((logId) => logId.trim()))];

    if (targetLogIds.some((logId) => !logId)) {
      throw new HTTPException(400, { message: 'Invalid request' });
    }

    const { records } = await c.var.db.query({
      records: {
        $: { where: { id: recordId } },
        author: { $: { fields: ['id'] }, user: { $: { fields: ['id'] } } },
        log: { $: { fields: ['id'] } },
        links: {},
        media: {},
      },
    });

    const record = records[0];
    if (!record) throw new HTTPException(404, { message: 'Record not found' });

    if (record.isDraft) {
      throw new HTTPException(409, { message: 'Record is still a draft' });
    }

    if (!record.author?.id || !record.log?.id || !record.teamId) {
      throw new HTTPException(400, { message: 'Invalid record' });
    }

    const authorId = record.author.id;
    const sourceLogId = record.log.id;
    const teamId = record.teamId;

    if (record.author.user?.id !== user.id) {
      throw new HTTPException(403, { message: 'Forbidden' });
    }

    if (targetLogIds.includes(sourceLogId)) {
      throw new HTTPException(400, { message: 'Invalid target log' });
    }

    const [{ roles }, { logs }] = await Promise.all([
      c.var.db.query({
        roles: { $: { where: { team: teamId, userId: user.id } } },
      }),
      c.var.db.query({
        logs: { $: { fields: ['id'], where: { team: teamId } } },
      }),
    ]);

    if (!permissions.canManageTeam(roles[0]?.role)) {
      throw new HTTPException(403, { message: 'Forbidden' });
    }

    const validLogIds = new Set(logs.map((log) => log.id));

    if (targetLogIds.some((logId) => !validLogIds.has(logId))) {
      throw new HTTPException(400, { message: 'Invalid target log' });
    }

    const now = new Date().toISOString();
    const copiedRecords = targetLogIds.map((logId) => ({ id: id(), logId }));

    await c.var.db.transact(
      copiedRecords.flatMap(({ id: copiedRecordId, logId }) => [
        c.var.db.tx.records[copiedRecordId]
          .update({
            date: now,
            isDraft: false,
            teamId,
            ...(record.text != null ? { text: record.text } : {}),
          })
          .link({ author: authorId, log: logId }),
        c.var.db.tx.activities[id()]
          .update({ date: now, teamId, type: 'record_published' })
          .link({
            actor: authorId,
            log: logId,
            record: copiedRecordId,
            team: teamId,
          }),
        ...(record.links ?? []).map((link) =>
          c.var.db.tx.links[id()]
            .update({
              label: link.label,
              ...(link.order != null ? { order: link.order } : {}),
              teamId,
              url: link.url,
            })
            .link({ record: copiedRecordId })
        ),
        ...(record.media ?? []).map((media) => {
          if (!media.type || !media.uri) {
            throw new HTTPException(400, { message: 'Invalid record media' });
          }

          return c.var.db.tx.media[id()]
            .update({
              ...(media.assetKey != null ? { assetKey: media.assetKey } : {}),
              ...(media.duration != null ? { duration: media.duration } : {}),
              ...(media.mimeType != null ? { mimeType: media.mimeType } : {}),
              ...(media.name != null ? { name: media.name } : {}),
              ...(media.order != null ? { order: media.order } : {}),
              ...(media.size != null ? { size: media.size } : {}),
              ...(media.thumbnailUri != null
                ? { thumbnailUri: media.thumbnailUri }
                : {}),
              type: media.type,
              uri: media.uri,
            })
            .link({ record: copiedRecordId });
        }),
      ])
    );

    return c.json({ records: copiedRecords });
  }
);

app.delete('/:recordId', db({ asUser: true }), async (c) => {
  const recordId = c.req.param('recordId');
  if (!recordId) throw new HTTPException(400, { message: 'Invalid request' });

  const { records } = await c.var.db.query({
    records: {
      $: { where: { id: recordId } },
      author: { user: { $: { fields: ['id'] } } },
      log: {
        team: {
          roles: { $: { fields: ['role'], where: { userId: c.var.user.id } } },
        },
      },
      media: {},
      replies: { media: {}, activities: {} },
      activities: {},
    },
  });

  const record = records[0];
  if (!record) return c.json({ success: true });
  const callerRole = record.log?.team?.roles?.[0]?.role;

  const canDelete = permissions.canDeleteOwnOrManagedResource({
    actorRole: callerRole,
    isAuthor: record.author?.user?.id === c.var.user.id,
  });

  if (!canDelete) throw new HTTPException(403, { message: 'Forbidden' });

  const mediaToDelete: Array<{
    assetKey?: string | null;
    uri?: string | null;
  }> = [];

  const activities = [...(record.activities ?? [])];

  for (const item of record.media ?? []) {
    mediaToDelete.push(item);
  }

  for (const reply of record.replies ?? []) {
    activities.push(...(reply.activities ?? []));

    for (const item of reply.media ?? []) {
      mediaToDelete.push(item);
    }
  }

  await c.var.db.transact(c.var.db.tx.records[recordId].delete());

  await Promise.all([
    mediaToDelete.length
      ? deleteUnusedMediaAssets(c.env, mediaToDelete)
      : undefined,
    deleteActivities(c.env, activities),
  ]);

  return c.json({ success: true });
});

export default app;
