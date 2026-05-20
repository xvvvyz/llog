import { deleteActivities } from '@/api/activity/delete-activities';
import * as cardActions from '@/api/cards/card-actions';
import { deleteUnusedFileAssets } from '@/api/files/delete-file-assets';
import { auth, db } from '@/api/middleware/db';
import * as recordCopy from '@/api/records/record-copy';
import { replayOfflineRecordDraft } from '@/api/records/record-offline-draft-replay';
import { publishDraftRecord } from '@/api/records/record-publish';
import { fileAssetQuery } from '@/domain/files/query';
import * as recordPermissions from '@/domain/records/permissions';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod/v4';

const app = new Hono<{ Bindings: CloudflareEnv }>();

const copyTargetsSchema = z.object({
  logIds: z.array(z.string()).min(1).max(100),
});

const offlineDraftReplaySchema = z.object({
  authorId: z.string().min(1),
  date: z.union([z.string(), z.number()]).optional(),
  isPinned: z.boolean().optional(),
  logId: z.string().min(1),
  tagIds: z.array(z.string().min(1)).max(100).optional(),
  teamId: z.string().min(1),
  text: z.string().max(10240),
});

app.post('/:recordId/publish', db(), auth(), async (c) => {
  const user = c.var.user!;

  await publishDraftRecord({
    dbClient: c.var.db,
    env: c.env,
    recordId: c.req.param('recordId'),
    userId: user.id,
  });

  return c.json({ success: true });
});

app.put(
  '/:recordId/offline-draft-replay',
  db(),
  auth(),
  zValidator('json', offlineDraftReplaySchema),
  async (c) => {
    await replayOfflineRecordDraft({
      dbClient: c.var.db,
      input: c.req.valid('json'),
      recordId: c.req.param('recordId'),
      userId: c.var.user.id,
    });

    return c.json({ success: true });
  }
);

app.post(
  '/:recordId/copy-draft',
  db(),
  auth(),
  zValidator('json', copyTargetsSchema),
  async (c) => {
    const user = c.var.user!;
    const { logIds } = c.req.valid('json');

    const draft = await recordCopy.createRecordCopyDraft({
      dbClient: c.var.db,
      logIds,
      recordId: c.req.param('recordId'),
      userId: user.id,
    });

    return c.json(draft);
  }
);

app.post(
  '/:recordId/finalize-copy',
  db(),
  auth(),
  zValidator('json', copyTargetsSchema),
  async (c) => {
    const user = c.var.user!;
    const { logIds } = c.req.valid('json');

    const copy = await recordCopy.finalizeRecordCopy({
      dbClient: c.var.db,
      draftRecordId: c.req.param('recordId'),
      logIds,
      userId: user.id,
    });

    return c.json(copy);
  }
);

app.delete('/:recordId', db(), auth(), async (c) => {
  const recordId = c.req.param('recordId');
  if (!recordId) throw new HTTPException(400, { message: 'Invalid request' });

  const { records } = await c.var.db.query({
    records: {
      $: { fields: ['id', 'isDraft', 'logId'], where: { id: recordId } },
      author: { user: { $: { fields: ['id'] } } },
      log: {
        $: { fields: ['id'] },
        team: {
          roles: { $: { fields: ['role'], where: { userId: c.var.user.id } } },
        },
      },
      tags: { $: { fields: ['id'] } },
      files: fileAssetQuery,
      replies: { files: fileAssetQuery, activities: {} },
      activities: {},
    },
  });

  const record = records[0];
  if (!record) return c.json({ success: true });
  const callerRole = record.log?.team?.roles?.[0]?.role;
  const isAuthor = record.author?.user?.id === c.var.user.id;
  const hasLog = !!(record.logId ?? record.log?.id);

  const canDelete = recordPermissions.canDeleteRecord({
    actorRole: callerRole,
    hasLog,
    isAuthor,
    isDraft: !!record.isDraft,
  });

  if (!canDelete) throw new HTTPException(403, { message: 'Forbidden' });
  const filesToDelete: { assetKey?: string | null; uri?: string | null }[] = [];
  const activities = [...(record.activities ?? [])];

  for (const item of record.files ?? []) {
    filesToDelete.push(item);
  }

  for (const reply of record.replies ?? []) {
    activities.push(...(reply.activities ?? []));

    for (const item of reply.files ?? []) {
      filesToDelete.push(item);
    }
  }

  await c.var.db.transact(c.var.db.tx.records[recordId].delete());
  const logId = record.logId ?? record.log?.id;
  const recordTagIds = record.tags?.map((tag) => tag.id) ?? [];

  await Promise.all([
    filesToDelete.length
      ? deleteUnusedFileAssets(c.env, filesToDelete)
      : undefined,
    deleteActivities(c.env, activities),
    !record.isDraft && logId && recordTagIds.length
      ? cardActions.queuePublishedRecordCardRefreshes({
          dbClient: c.var.db,
          env: c.env,
          logId,
          recordTagIds,
        })
      : undefined,
  ]);

  return c.json({ success: true });
});

export default app;
