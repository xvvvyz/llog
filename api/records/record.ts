import { auth, db } from '@/api/middleware/db';
import * as push from '@/api/push/helpers';
import { deleteActivities } from '@/utilities/delete-activities';
import * as p from '@/utilities/permissions';
import { id } from '@instantdb/admin';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';

const app = new Hono<{ Bindings: CloudflareEnv }>();

app.post('/publish', db(), auth(), async (c) => {
  const user = c.var.user!;
  const recordId = c.req.param('recordId');

  if (!recordId) {
    throw new HTTPException(400, { message: 'Invalid request' });
  }

  const { records } = await c.var.db.query({
    records: {
      $: { where: { id: recordId } },
      author: {
        $: { fields: ['id', 'name'] as ['id', 'name'] },
        user: { $: { fields: ['id'] as ['id'] } },
      },
      log: {
        $: { fields: ['id', 'name'] as ['id', 'name'] },
        profiles: {
          user: {
            $: { fields: ['id'] as ['id'] },
            subscriptions: {
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
              subscriptions: {
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
      media: { $: { fields: ['id'] as ['id'] } },
    },
  });

  const record = records[0];

  if (!record) {
    throw new HTTPException(404, { message: 'Record not found' });
  }

  const actorRole = record.log?.team?.roles?.find(
    (role) => role.userId === user.id
  )?.role;

  const isAuthor = record.author?.user?.id === user.id;

  const isLogMember = !!record.log?.profiles?.some(
    (profile) => profile.user?.id === user.id
  );

  if (!isAuthor || (!p.canManageTeam(actorRole) && !isLogMember)) {
    throw new HTTPException(403, { message: 'Forbidden' });
  }

  if (!record.isDraft) {
    throw new HTTPException(409, { message: 'Record already published' });
  }

  const hasContent = !!record.text?.trim() || !!record.media?.length;

  if (!hasContent || !record.log?.id || !record.teamId || !record.author?.id) {
    throw new HTTPException(400, { message: 'Invalid record draft' });
  }

  const now = new Date().toISOString();

  await c.var.db.transact([
    c.var.db.tx.records[recordId].update({ date: now, isDraft: false }),
    c.var.db.tx.activities[id()]
      .update({
        type: 'record_published',
        date: now,
        teamId: record.teamId,
      })
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
      text: record.text,
    })
  );

  return c.json({ success: true });
});

app.delete('/', db({ asUser: true }), async (c) => {
  const recordId = c.req.param('recordId');

  if (!recordId) {
    throw new HTTPException(400, { message: 'Invalid request' });
  }

  const { records } = await c.var.db.query({
    records: {
      $: { where: { id: recordId } },
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
      media: {},
      replies: { media: {}, activities: {} },
      activities: {},
    },
  });

  const record = records[0];
  if (!record) return c.json({ success: true });
  const callerRole = record.log?.team?.roles?.[0]?.role;

  const canDelete = p.canDeleteOwnOrManagedResource({
    actorRole: callerRole,
    isAuthor: record.author?.user?.id === c.var.user.id,
  });

  if (!canDelete) {
    throw new HTTPException(403, { message: 'Forbidden' });
  }

  const r2Keys: string[] = [];
  const activities = [...(record.activities ?? [])];

  for (const item of record.media ?? []) {
    r2Keys.push(item.uri as string);
    if (item.previewUri) r2Keys.push(item.previewUri as string);
  }

  for (const reply of record.replies ?? []) {
    activities.push(...(reply.activities ?? []));

    for (const item of reply.media ?? []) {
      r2Keys.push(item.uri as string);
      if (item.previewUri) r2Keys.push(item.previewUri as string);
    }
  }

  await c.var.db.transact(c.var.db.tx.records[recordId].delete());

  await Promise.all([
    r2Keys.length ? c.env.R2.delete(r2Keys) : undefined,
    deleteActivities(c.env, activities),
  ]);

  return c.json({ success: true });
});

export default app;
