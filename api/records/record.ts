import { deleteMediaAssets } from '@/api/files/delete-media-assets';
import { auth, db } from '@/api/middleware/db';
import * as push from '@/api/push/web-push';
import { deleteActivities } from '@/features/activity/lib/delete-activities';
import * as permissions from '@/features/teams/lib/permissions';
import { id } from '@instantdb/admin';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';

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
  const hasContent = !!trimmedText || !!record.media?.length;

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
    mediaToDelete.length ? deleteMediaAssets(c.env, mediaToDelete) : undefined,
    deleteActivities(c.env, activities),
  ]);

  return c.json({ success: true });
});

export default app;
