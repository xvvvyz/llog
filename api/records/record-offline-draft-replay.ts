import type { Db } from '@/api/middleware/db';
import * as permissions from '@/domain/teams/permissions';
import { HTTPException } from 'hono/http-exception';

export type OfflineDraftReplayInput = {
  authorId: string;
  date?: string | number;
  isPinned?: boolean;
  logId: string;
  tagIds?: string[];
  teamId: string;
  text: string;
};

export const authorizeRecordDraftReplay = async ({
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

export const replayOfflineRecordDraft = async ({
  dbClient,
  input,
  now,
  recordId,
  userId,
}: {
  dbClient: Db;
  input: OfflineDraftReplayInput;
  now?: string;
  recordId?: string;
  userId: string;
}) => {
  if (!recordId) throw new HTTPException(400, { message: 'Invalid request' });
  const { authorId, date, isPinned, logId, tagIds = [], teamId, text } = input;

  const { staleTagIds, tagIds: uniqueTagIds } =
    await authorizeRecordDraftReplay({
      authorId,
      dbClient,
      logId,
      recordId,
      tagIds,
      teamId,
      userId,
    });

  // This is intentionally API-backed instead of a client Instant mutation:
  // after a full offline refresh, the optimistic draft row may not exist yet,
  // and allowing clients to recreate identity links directly would make the
  // general Instant permissions too broad.
  const recordTx = dbClient.tx.records[recordId]
    .update(
      {
        authorId,
        date: date ?? now ?? new Date().toISOString(),
        isDraft: true,
        ...(isPinned != null ? { isPinned } : {}),
        logId,
        teamId,
        text,
      },
      { upsert: true }
    )
    .link({ author: authorId, log: logId });

  await dbClient.transact([
    recordTx,
    ...staleTagIds.map((tagId) =>
      dbClient.tx.records[recordId].unlink({ tags: tagId })
    ),
    ...uniqueTagIds.map((tagId) =>
      dbClient.tx.records[recordId].link({ tags: tagId })
    ),
  ]);
};
