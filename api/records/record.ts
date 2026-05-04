import { deleteUnusedFileAssets } from '@/api/files/delete-file-assets';
import { auth, db, type Db } from '@/api/middleware/db';
import * as push from '@/api/push/web-push';
import { deleteActivities } from '@/features/activity/lib/delete-activities';
import * as permissions from '@/features/teams/lib/permissions';
import { zValidator } from '@hono/zod-validator';
import { id } from '@instantdb/admin';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod/v4';

const app = new Hono<{ Bindings: CloudflareEnv }>();

const copyTargetsSchema = z.object({
  logIds: z.array(z.string()).min(1).max(100),
});

type RecordCopyFile = {
  assetKey?: string | null;
  duration?: number | null;
  mimeType?: string | null;
  name?: string | null;
  order?: number | null;
  size?: number | null;
  thumbnailUri?: string | null;
  tracks?: unknown;
  transcript?: string | null;
  type?: string | null;
  uri?: string | null;
};

type RecordCopyLink = {
  label?: string | null;
  order?: number | null;
  url?: string | null;
};

type RecordCopyDraftTag = {
  id?: string | null;
  type?: string | null;
  logs?: { id?: string | null }[];
};

type RecordCopyTargetLog = { id: string; teamId: string };

const normalizeCopyOrder = (
  order: number | null | undefined,
  fallback: number
) => (Number.isFinite(order) && order != null ? Math.round(order) : fallback);

const normalizeTargetLogIds = (logIds: string[]) => {
  const targetLogIds = [...new Set(logIds.map((logId) => logId.trim()))];

  if (targetLogIds.some((logId) => !logId)) {
    throw new HTTPException(400, { message: 'Invalid request' });
  }

  return targetLogIds;
};

const getClonedFileData = (file: RecordCopyFile, fallbackOrder: number) => {
  if (!file.type || (!file.uri && !file.assetKey)) {
    throw new HTTPException(400, { message: 'Invalid record file' });
  }

  return {
    ...(file.assetKey != null ? { assetKey: file.assetKey } : {}),
    ...(file.duration != null ? { duration: file.duration } : {}),
    ...(file.mimeType != null ? { mimeType: file.mimeType } : {}),
    ...(file.name != null ? { name: file.name } : {}),
    order: normalizeCopyOrder(file.order, fallbackOrder),
    ...(file.size != null ? { size: file.size } : {}),
    ...(file.thumbnailUri != null ? { thumbnailUri: file.thumbnailUri } : {}),
    ...(file.tracks != null ? { tracks: file.tracks } : {}),
    ...(file.transcript != null ? { transcript: file.transcript } : {}),
    type: file.type,
    ...(file.uri != null ? { uri: file.uri } : {}),
  };
};

const getClonedLinkData = (
  link: RecordCopyLink,
  teamId: string,
  fallbackOrder: number
) => {
  if (!link.label || !link.url) {
    throw new HTTPException(400, { message: 'Invalid record link' });
  }

  return {
    label: link.label,
    order: normalizeCopyOrder(link.order, fallbackOrder),
    teamId,
    url: link.url,
  };
};

const getCopyDraftTagIdsForLog = (
  tags: RecordCopyDraftTag[] | undefined,
  logId: string
) =>
  (tags ?? [])
    .filter(
      (tag) =>
        tag.type === 'record' &&
        !!tag.id &&
        !!tag.logs?.some((log) => log.id === logId)
    )
    .map((tag) => tag.id as string);

const assertTeamMember = async ({
  dbClient,
  teamId,
  userId,
}: {
  dbClient: Db;
  teamId: string;
  userId: string;
}) => {
  const { roles } = await dbClient.query({
    roles: { $: { fields: ['id'], where: { team: teamId, userId } } },
  });

  if (!roles[0]?.id) throw new HTTPException(403, { message: 'Forbidden' });
};

const assertAccessibleTargetLogs = async ({
  dbClient,
  targetLogIds,
  userId,
}: {
  dbClient: Db;
  targetLogIds: string[];
  userId: string;
}): Promise<RecordCopyTargetLog[]> => {
  const { logs } = await dbClient.query({
    logs: {
      $: { fields: ['id', 'teamId'], where: { id: { $in: targetLogIds } } },
      team: { roles: { $: { fields: ['role'], where: { userId } } } },
      profiles: { user: { $: { fields: ['id'] } } },
    },
  });

  const logsById = new Map(logs.map((log) => [log.id, log]));

  return targetLogIds.map((logId) => {
    const log = logsById.get(logId);

    if (!log?.id || !log.teamId) {
      throw new HTTPException(400, { message: 'Invalid target log' });
    }

    const role = log.team?.roles?.[0]?.role;

    const isLogMember = !!log.profiles?.some(
      (profile) => profile.user?.id === userId
    );

    if (!permissions.canManageTeam(role) && !isLogMember) {
      throw new HTTPException(403, { message: 'Forbidden' });
    }

    return { id: log.id, teamId: log.teamId };
  });
};

const getCopyDraftTeamId = ({
  sourceTeamId,
  targetLogs,
}: {
  sourceTeamId: string;
  targetLogs: RecordCopyTargetLog[];
}) => {
  const targetTeamIds = [...new Set(targetLogs.map((log) => log.teamId))];
  return targetTeamIds.length === 1 ? targetTeamIds[0] : sourceTeamId;
};

const prepareRecordCopySource = async ({
  dbClient,
  recordId,
  targetLogIds,
  userId,
}: {
  dbClient: Db;
  recordId?: string;
  targetLogIds: string[];
  userId: string;
}) => {
  if (!recordId) throw new HTTPException(400, { message: 'Invalid request' });

  const { records } = await dbClient.query({
    records: {
      $: { where: { id: recordId } },
      author: { $: { fields: ['id'] }, user: { $: { fields: ['id'] } } },
      log: { $: { fields: ['id'] } },
      links: {},
      files: {},
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
  const sourceTeamId = record.teamId;

  if (record.author.user?.id !== userId) {
    throw new HTTPException(403, { message: 'Forbidden' });
  }

  if (targetLogIds.includes(sourceLogId)) {
    throw new HTTPException(400, { message: 'Invalid target log' });
  }

  await assertTeamMember({ dbClient, teamId: sourceTeamId, userId });

  const targetLogs = await assertAccessibleTargetLogs({
    dbClient,
    targetLogIds,
    userId,
  });

  return { authorId, record, sourceTeamId, targetLogs };
};

const buildPublishedRecordCopies = ({
  authorId,
  dbClient,
  files,
  links,
  now,
  targetLogs,
  text,
}: {
  authorId: string;
  dbClient: Db;
  files?: RecordCopyFile[];
  links?: RecordCopyLink[];
  now: string;
  targetLogs: RecordCopyTargetLog[];
  text?: string | null;
}) => {
  const copiedRecords = targetLogs.map((log) => ({
    id: id(),
    logId: log.id,
    teamId: log.teamId,
  }));

  const transactions = copiedRecords.flatMap(
    ({ id: copiedRecordId, logId, teamId }) => [
      dbClient.tx.records[copiedRecordId]
        .update({
          date: now,
          isDraft: false,
          teamId,
          ...(text != null ? { text } : {}),
        })
        .link({ author: authorId, log: logId }),
      dbClient.tx.activities[id()]
        .update({ date: now, teamId, type: 'record_published' })
        .link({
          actor: authorId,
          log: logId,
          record: copiedRecordId,
          team: teamId,
        }),
      ...(links ?? []).map((link, order) =>
        dbClient.tx.links[id()]
          .update(getClonedLinkData(link, teamId, order))
          .link({ record: copiedRecordId })
      ),
      ...(files ?? []).map((file, order) =>
        dbClient.tx.files[id()]
          .update(getClonedFileData(file, order))
          .link({ record: copiedRecordId })
      ),
    ]
  );

  return { copiedRecords, transactions };
};

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
      files: { $: { fields: ['id'] } },
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
    !!trimmedText || !!record.files?.length || !!record.links?.length;

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
  '/:recordId/copy-draft',
  db(),
  auth(),
  zValidator('json', copyTargetsSchema),
  async (c) => {
    const user = c.var.user!;
    const sourceRecordId = c.req.param('recordId');
    const { logIds } = c.req.valid('json');
    const targetLogIds = normalizeTargetLogIds(logIds);

    const { authorId, record, sourceTeamId, targetLogs } =
      await prepareRecordCopySource({
        dbClient: c.var.db,
        recordId: sourceRecordId,
        targetLogIds,
        userId: user.id,
      });

    const draftTeamId = getCopyDraftTeamId({ sourceTeamId, targetLogs });
    const draftRecordId = id();
    const now = new Date().toISOString();

    await c.var.db.transact([
      c.var.db.tx.records[draftRecordId]
        .update({
          date: now,
          isDraft: true,
          teamId: draftTeamId,
          ...(record.text != null ? { text: record.text } : {}),
        })
        .link({ author: authorId }),
      ...(record.links ?? []).map((link, order) =>
        c.var.db.tx.links[id()]
          .update(getClonedLinkData(link, draftTeamId, order))
          .link({ record: draftRecordId })
      ),
      ...(record.files ?? []).map((file, order) =>
        c.var.db.tx.files[id()]
          .update(getClonedFileData(file, order))
          .link({ record: draftRecordId })
      ),
    ]);

    return c.json({
      draftRecordId,
      targetLogIds: targetLogs.map((log) => log.id),
    });
  }
);

app.post(
  '/:recordId/finalize-copy',
  db(),
  auth(),
  zValidator('json', copyTargetsSchema),
  async (c) => {
    const user = c.var.user!;
    const draftRecordId = c.req.param('recordId');

    if (!draftRecordId) {
      throw new HTTPException(400, { message: 'Invalid request' });
    }

    const { logIds } = c.req.valid('json');
    const targetLogIds = normalizeTargetLogIds(logIds);

    const { records } = await c.var.db.query({
      records: {
        $: { where: { id: draftRecordId } },
        author: { $: { fields: ['id'] }, user: { $: { fields: ['id'] } } },
        log: { $: { fields: ['id'] } },
        links: {},
        files: {},
        tags: {
          $: { fields: ['id', 'type'] },
          logs: { $: { fields: ['id'] } },
        },
      },
    });

    const record = records[0];
    if (!record) throw new HTTPException(404, { message: 'Record not found' });

    if (record.author?.user?.id !== user.id) {
      throw new HTTPException(403, { message: 'Forbidden' });
    }

    if (!record.isDraft || record.log?.id) {
      throw new HTTPException(409, { message: 'Invalid copy draft' });
    }

    if (!record.author?.id || !record.teamId) {
      throw new HTTPException(400, { message: 'Invalid copy draft' });
    }

    const trimmedText = record.text?.trim() ?? '';

    const hasContent =
      !!trimmedText || !!record.files?.length || !!record.links?.length;

    if (!hasContent) {
      throw new HTTPException(400, { message: 'Invalid copy draft' });
    }

    await assertTeamMember({
      dbClient: c.var.db,
      teamId: record.teamId,
      userId: user.id,
    });

    const targetLogs = await assertAccessibleTargetLogs({
      dbClient: c.var.db,
      targetLogIds,
      userId: user.id,
    });

    const now = new Date().toISOString();

    const { copiedRecords, transactions } = buildPublishedRecordCopies({
      authorId: record.author.id,
      dbClient: c.var.db,
      files: record.files,
      links: record.links,
      now,
      targetLogs,
      text: trimmedText,
    });

    const tagTransactions =
      targetLogs.length === 1
        ? getCopyDraftTagIdsForLog(record.tags, targetLogs[0].id).flatMap(
            (tagId) =>
              copiedRecords.map((copiedRecord) =>
                c.var.db.tx.records[copiedRecord.id].link({ tags: tagId })
              )
          )
        : [];

    await c.var.db.transact([
      ...transactions,
      ...tagTransactions,
      c.var.db.tx.records[draftRecordId].delete(),
    ]);

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
      files: {},
      replies: { files: {}, activities: {} },
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

  const filesToDelete: Array<{
    assetKey?: string | null;
    uri?: string | null;
  }> = [];

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
