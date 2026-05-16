import { deleteActivities } from '@/api/activity/delete-activities';
import { deleteUnusedFileAssets } from '@/api/files/delete-file-assets';
import { auth, db, type Db } from '@/api/middleware/db';
import { notificationRecipientLogQuery } from '@/api/push/query';
import * as push from '@/api/push/web-push';
import { copyFileQuery, fileAssetQuery } from '@/domain/files/query';
import * as copyTags from '@/domain/records/copy-tags';
import * as recordPublish from '@/domain/records/publish';
import * as permissions from '@/domain/teams/permissions';
import schema from '@/instant.schema';
import { zValidator } from '@hono/zod-validator';
import { id, type InstaQLEntity } from '@instantdb/admin';
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

type FileEntity = InstaQLEntity<typeof schema, 'files'>;
type LinkEntity = InstaQLEntity<typeof schema, 'links'>;
type LogEntity = InstaQLEntity<typeof schema, 'logs'>;

type RecordCopyFile = Partial<
  Pick<
    FileEntity,
    | 'audd'
    | 'assetKey'
    | 'duration'
    | 'mimeType'
    | 'name'
    | 'order'
    | 'size'
    | 'thumbnailUri'
    | 'tracks'
    | 'transcript'
    | 'type'
    | 'uri'
  >
>;

type RecordCopyLink = Partial<Pick<LinkEntity, 'label' | 'order' | 'url'>>;
type RecordCopyTargetLog = Pick<LogEntity, 'id' | 'teamId'>;

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
    ...(file.audd != null ? { audd: file.audd } : {}),
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

const getCopyDraftTagIdsForTargetLog = async ({
  dbClient,
  sourceTags,
  targetLog,
}: {
  dbClient: Db;
  sourceTags: copyTags.CopyRecordTag[] | undefined;
  targetLog: RecordCopyTargetLog;
}) => {
  const { tags } = await dbClient.query({
    tags: {
      $: {
        fields: ['id', 'name'],
        where: { logs: targetLog.id, teamId: targetLog.teamId, type: 'record' },
      },
    },
  });

  return copyTags.resolveCopyDraftTagIdsForTargetLog({
    sourceTags,
    targetLogId: targetLog.id,
    targetTags: tags,
  });
};

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

const authorizeRecordDraftReplay = async ({
  authorId,
  dbClient,
  logId,
  recordId,
  tagIds,
  teamId,
  userId,
}: {
  authorId: string;
  dbClient: Db;
  logId: string;
  recordId: string;
  tagIds: string[];
  teamId: string;
  userId: string;
}) => {
  const uniqueTagIds = [...new Set(tagIds)];

  const { profiles, logs, records } = await dbClient.query({
    profiles: {
      $: { fields: ['id' as const], where: { id: authorId } },
      user: { $: { fields: ['id' as const] } },
    },
    logs: {
      $: { fields: ['id' as const, 'teamId' as const], where: { id: logId } },
      team: { roles: { $: { fields: ['role' as const], where: { userId } } } },
      profiles: { user: { $: { fields: ['id' as const] } } },
    },
    records: {
      $: {
        fields: ['id' as const, 'isDraft' as const],
        where: { id: recordId },
      },
      author: {
        $: { fields: ['id' as const] },
        user: { $: { fields: ['id' as const] } },
      },
      tags: { $: { fields: ['id' as const] } },
    },
  });

  const { tags } = uniqueTagIds.length
    ? await dbClient.query({
        tags: {
          $: {
            fields: ['id' as const, 'teamId' as const, 'type' as const],
            where: { id: { $in: uniqueTagIds } },
          },
          logs: { $: { fields: ['id' as const] } },
        },
      })
    : { tags: [] };

  const profile = profiles[0];
  const log = logs[0];
  const existingRecord = records[0];
  const role = log?.team?.roles?.[0]?.role;

  const isLogMember = !!log?.profiles?.some(
    (profile) => profile.user?.id === userId
  );

  if (
    !profile?.id ||
    profile.user?.id !== userId ||
    !log?.id ||
    log.teamId !== teamId ||
    (!permissions.canManageTeam(role) && !isLogMember)
  ) {
    throw new HTTPException(403, { message: 'Forbidden' });
  }

  if (existingRecord?.id) {
    if (existingRecord.isDraft !== true) {
      throw new HTTPException(409, { message: 'Record already published' });
    }

    if (existingRecord.author?.user?.id !== userId) {
      throw new HTTPException(403, { message: 'Forbidden' });
    }
  }

  if (tags.length !== uniqueTagIds.length) {
    throw new HTTPException(400, { message: 'Invalid record tags' });
  }

  for (const tag of tags) {
    const belongsToLog = !!tag.logs?.some((log) => log.id === logId);

    if (tag.teamId !== teamId || tag.type !== 'record' || !belongsToLog) {
      throw new HTTPException(400, { message: 'Invalid record tags' });
    }
  }

  const requestedTagIds = new Set(uniqueTagIds);

  const staleTagIds =
    existingRecord?.tags
      ?.map((tag) => tag.id)
      .filter(
        (tagId): tagId is string => !!tagId && !requestedTagIds.has(tagId)
      ) ?? [];

  return { staleTagIds, tagIds: uniqueTagIds };
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
      files: copyFileQuery,
      tags: {
        $: { fields: ['id', 'name', 'type'] },
        logs: { $: { fields: ['id'] } },
      },
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
  const sourceTeamId = record.teamId;

  if (record.author.user?.id !== userId) {
    throw new HTTPException(403, { message: 'Forbidden' });
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
  isPinned,
  links,
  now,
  targetLogs,
  text,
}: {
  authorId: string;
  dbClient: Db;
  files?: RecordCopyFile[];
  isPinned?: boolean;
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
      ...recordPublish.buildCreatePublishedRecordTransactions({
        activityId: id(),
        authorId,
        db: dbClient,
        isPinned,
        logId,
        now,
        recordId: copiedRecordId,
        teamId,
        text,
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
      log: { $: { fields: ['id', 'name'] }, ...notificationRecipientLogQuery },
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

  await c.var.db.transact(
    recordPublish.buildPublishDraftRecordTransactions({
      activityDate: now,
      activityId: id(),
      actorId: record.author.id,
      contentDate: record.date ?? now,
      db: c.var.db,
      logId: record.log.id,
      recordId,
      teamId: record.teamId,
      text: trimmedText,
    })
  );

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
    }),
    { staleSubscriptionDb: c.var.db }
  );

  return c.json({ success: true });
});

app.put(
  '/:recordId/offline-draft-replay',
  db(),
  auth(),
  zValidator('json', offlineDraftReplaySchema),
  async (c) => {
    const user = c.var.user;
    const recordId = c.req.param('recordId');
    if (!recordId) throw new HTTPException(400, { message: 'Invalid request' });

    const {
      authorId,
      date,
      isPinned,
      logId,
      tagIds = [],
      teamId,
      text,
    } = c.req.valid('json');

    const { staleTagIds, tagIds: uniqueTagIds } =
      await authorizeRecordDraftReplay({
        authorId,
        dbClient: c.var.db,
        logId,
        recordId,
        tagIds,
        teamId,
        userId: user.id,
      });

    // This is intentionally API-backed instead of a client Instant mutation:
    // after a full offline refresh, the optimistic draft row may not exist yet,
    // and allowing clients to recreate identity links directly would make the
    // general Instant permissions too broad.
    const recordTx = c.var.db.tx.records[recordId]
      .update(
        {
          authorId,
          date: date ?? new Date().toISOString(),
          isDraft: true,
          ...(isPinned != null ? { isPinned } : {}),
          logId,
          teamId,
          text,
        },
        { upsert: true }
      )
      .link({ author: authorId, log: logId });

    await c.var.db.transact([
      recordTx,
      ...staleTagIds.map((tagId) =>
        c.var.db.tx.records[recordId].unlink({ tags: tagId })
      ),
      ...uniqueTagIds.map((tagId) =>
        c.var.db.tx.records[recordId].link({ tags: tagId })
      ),
    ]);

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

    const draftTagIds =
      targetLogs.length === 1
        ? await getCopyDraftTagIdsForTargetLog({
            dbClient: c.var.db,
            sourceTags: record.tags,
            targetLog: targetLogs[0],
          })
        : [];

    await c.var.db.transact([
      c.var.db.tx.records[draftRecordId]
        .update({
          authorId,
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
      ...draftTagIds.map((tagId) =>
        c.var.db.tx.records[draftRecordId].link({ tags: tagId })
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
        files: copyFileQuery,
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
      isPinned: record.isPinned,
      links: record.links,
      now,
      targetLogs,
      text: trimmedText,
    });

    const tagTransactions =
      targetLogs.length === 1
        ? copyTags
            .resolveCopyDraftTagIdsForTargetLog({
              sourceTags: record.tags,
              targetLogId: targetLogs[0].id,
            })
            .flatMap((tagId) =>
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
