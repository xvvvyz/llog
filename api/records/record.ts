import { deleteActivities } from '@/api/activity/delete-activities';
import { deleteUnusedFileAssets } from '@/api/files/delete-file-assets';
import { auth, db } from '@/api/middleware/db';
import { replayOfflineRecordDraft } from '@/api/records/record-offline-draft-replay';
import { publishDraftRecord } from '@/api/records/record-publish';
import { fileAssetQuery } from '@/domain/files/query';
import * as permissions from '@/domain/teams/permissions';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod/v4';
import * as recordCopy from '@/api/records/record-copy';

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
      files: fileAssetQuery,
      replies: { files: fileAssetQuery, activities: {} },
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

  await Promise.all([
    filesToDelete.length
      ? deleteUnusedFileAssets(c.env, filesToDelete)
      : undefined,
    deleteActivities(c.env, activities),
  ]);

  return c.json({ success: true });
});

export default app;
