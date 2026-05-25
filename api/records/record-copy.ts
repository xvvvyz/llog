import type { Db } from '@/api/middleware/db';
import * as cardActions from '@/api/cards/card-actions';
import { copyFileQuery } from '@/domain/files/query';
import * as copyTags from '@/domain/records/copy-tags';
import * as recordPublish from '@/domain/records/publish';
import * as permissions from '@/domain/teams/permissions';
import schema from '@/instant.schema';
import { id, type InstaQLEntity } from '@instantdb/admin';
import { HTTPException } from 'hono/http-exception';

type FileEntity = InstaQLEntity<typeof schema, 'files'>;
type LinkEntity = InstaQLEntity<typeof schema, 'links'>;
type LogEntity = InstaQLEntity<typeof schema, 'logs'>;

export type RecordCopyFile = Partial<
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

export type RecordCopyLink = Partial<
  Pick<LinkEntity, 'label' | 'order' | 'url'>
>;

type RecordCopyTargetLog = Pick<LogEntity, 'id' | 'teamId'>;

export const normalizeCopyOrder = (
  order: number | null | undefined,
  fallback: number
) => (Number.isFinite(order) && order != null ? Math.round(order) : fallback);

export const normalizeTargetLogIds = (logIds: string[]) => {
  const targetLogIds = [...new Set(logIds.map((logId) => logId.trim()))];

  if (targetLogIds.some((logId) => !logId)) {
    throw new HTTPException(400, { message: 'Invalid request' });
  }

  return targetLogIds;
};

export const getClonedFileData = (
  file: RecordCopyFile,
  fallbackOrder: number
) => {
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

export const getClonedLinkData = (
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

export const getCopyDraftTeamId = ({
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
  contentDate,
  dbClient,
  files,
  isPinned,
  links,
  now,
  targetLogs,
  text,
}: {
  authorId: string;
  contentDate?: string | number;
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
        contentDate,
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

export const createRecordCopyDraft = async ({
  dbClient,
  logIds,
  now,
  recordId,
  userId,
}: {
  dbClient: Db;
  logIds: string[];
  now?: string;
  recordId?: string;
  userId: string;
}) => {
  const targetLogIds = normalizeTargetLogIds(logIds);

  const { authorId, record, sourceTeamId, targetLogs } =
    await prepareRecordCopySource({ dbClient, recordId, targetLogIds, userId });

  const draftTeamId = getCopyDraftTeamId({ sourceTeamId, targetLogs });
  const draftRecordId = id();
  const draftDate = now ?? new Date().toISOString();

  const draftTagIds =
    targetLogs.length === 1
      ? await getCopyDraftTagIdsForTargetLog({
          dbClient,
          sourceTags: record.tags,
          targetLog: targetLogs[0],
        })
      : [];

  await dbClient.transact([
    dbClient.tx.records[draftRecordId]
      .update({
        authorId,
        date: draftDate,
        isDraft: true,
        teamId: draftTeamId,
        ...(record.text != null ? { text: record.text } : {}),
      })
      .link({ author: authorId }),
    ...(record.links ?? []).map((link, order) =>
      dbClient.tx.links[id()]
        .update(getClonedLinkData(link, draftTeamId, order))
        .link({ record: draftRecordId })
    ),
    ...(record.files ?? []).map((file, order) =>
      dbClient.tx.files[id()]
        .update(getClonedFileData(file, order))
        .link({ record: draftRecordId })
    ),
    ...draftTagIds.map((tagId) =>
      dbClient.tx.records[draftRecordId].link({ tags: tagId })
    ),
  ]);

  return { draftRecordId, targetLogIds: targetLogs.map((log) => log.id) };
};

export const finalizeRecordCopy = async ({
  dbClient,
  date,
  draftRecordId,
  env,
  logIds,
  now,
  userId,
}: {
  dbClient: Db;
  date?: string | number;
  draftRecordId?: string;
  env: CloudflareEnv;
  logIds: string[];
  now?: string;
  userId: string;
}) => {
  if (!draftRecordId) {
    throw new HTTPException(400, { message: 'Invalid request' });
  }

  const targetLogIds = normalizeTargetLogIds(logIds);

  const { records } = await dbClient.query({
    records: {
      $: { where: { id: draftRecordId } },
      author: { $: { fields: ['id'] }, user: { $: { fields: ['id'] } } },
      log: { $: { fields: ['id'] } },
      links: {},
      files: copyFileQuery,
      tags: { $: { fields: ['id', 'type'] }, logs: { $: { fields: ['id'] } } },
    },
  });

  const record = records[0];
  if (!record) throw new HTTPException(404, { message: 'Record not found' });

  if (record.author?.user?.id !== userId) {
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

  await assertTeamMember({ dbClient, teamId: record.teamId, userId });

  const targetLogs = await assertAccessibleTargetLogs({
    dbClient,
    targetLogIds,
    userId,
  });

  const copyDate = now ?? new Date().toISOString();

  const { copiedRecords, transactions } = buildPublishedRecordCopies({
    authorId: record.author.id,
    contentDate: date,
    dbClient,
    files: record.files,
    isPinned: record.isPinned,
    links: record.links,
    now: copyDate,
    targetLogs,
    text: trimmedText,
  });

  const copiedRecordTagIds =
    targetLogs.length === 1
      ? copyTags.resolveCopyDraftTagIdsForTargetLog({
          sourceTags: record.tags,
          targetLogId: targetLogs[0].id,
        })
      : [];

  const tagTransactions =
    targetLogs.length === 1
      ? copiedRecordTagIds.flatMap((tagId) =>
          copiedRecords.map((copiedRecord) =>
            dbClient.tx.records[copiedRecord.id].link({ tags: tagId })
          )
        )
      : [];

  await dbClient.transact([
    ...transactions,
    ...tagTransactions,
    dbClient.tx.records[draftRecordId].delete(),
  ]);

  if (targetLogs.length === 1) {
    await cardActions.queuePublishedRecordCardRefreshes({
      dbClient,
      env,
      logId: targetLogs[0].id,
      recordTagIds: copiedRecordTagIds,
    });
  }

  return { records: copiedRecords };
};
