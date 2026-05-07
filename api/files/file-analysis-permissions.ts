import { type Db } from '@/api/middleware/db';
import * as permissions from '@/domain/teams/permissions';
import { HTTPException } from 'hono/http-exception';

export type FileAnalysisTarget = {
  linkField: 'record' | 'reply';
  linkId: string;
  recordId: string;
};

const getTeamRoleForUser = async (
  dbClient: Db,
  teamId: string,
  userId: string
) => {
  const { roles } = await dbClient.query({
    roles: { $: { fields: ['role'], where: { team: teamId, userId } } },
  });

  return roles[0]?.role;
};

const assertCanAnalyzeSharedLogFiles = ({
  actorRole,
  isAuthor,
  isDraft,
}: {
  actorRole?: string | null;
  isAuthor: boolean;
  isDraft?: boolean | null;
}) => {
  if (isDraft && !isAuthor) {
    throw new HTTPException(403, { message: 'Forbidden' });
  }

  if (!permissions.canManageTeam(actorRole)) {
    throw new HTTPException(403, { message: 'Forbidden' });
  }
};

const assertCanAnalyzeRecordFiles = async ({
  dbClient,
  recordId,
  userId,
}: {
  dbClient: Db;
  recordId: string;
  userId: string;
}) => {
  const { records } = await dbClient.query({
    records: {
      $: { fields: ['id', 'isDraft', 'teamId'], where: { id: recordId } },
      author: { user: { $: { fields: ['id'] } } },
      log: {
        $: { fields: ['id'] },
        team: {
          $: { fields: ['id'] },
          roles: { $: { fields: ['role'], where: { userId } } },
        },
      },
    },
  });

  const record = records[0];

  if (!record?.id) {
    throw new HTTPException(404, { message: 'Record not found' });
  }

  const isAuthor = record.author?.user?.id === userId;
  const isLoglessDraft = record.isDraft && !record.log?.id;

  const actorRole =
    record.log?.team?.roles?.[0]?.role ??
    (isLoglessDraft && record.teamId
      ? await getTeamRoleForUser(dbClient, record.teamId, userId)
      : undefined);

  assertCanAnalyzeSharedLogFiles({
    actorRole,
    isAuthor,
    isDraft: record.isDraft,
  });
};

const assertCanAnalyzeReplyFiles = async ({
  dbClient,
  recordId,
  replyId,
  userId,
}: {
  dbClient: Db;
  recordId: string;
  replyId: string;
  userId: string;
}) => {
  const { replies } = await dbClient.query({
    replies: {
      $: {
        fields: ['id', 'isDraft'],
        where: { id: replyId, record: recordId },
      },
      author: { user: { $: { fields: ['id'] } } },
      record: {
        $: { fields: ['id'] },
        log: {
          team: {
            $: { fields: ['id'] },
            roles: { $: { fields: ['role'], where: { userId } } },
          },
        },
      },
    },
  });

  const reply = replies[0];

  if (!reply?.id || reply.record?.id !== recordId) {
    throw new HTTPException(404, { message: 'Reply not found' });
  }

  const isAuthor = reply.author?.user?.id === userId;
  const actorRole = reply.record?.log?.team?.roles?.[0]?.role;

  assertCanAnalyzeSharedLogFiles({
    actorRole,
    isAuthor,
    isDraft: reply.isDraft,
  });
};

export const assertCanAnalyzeTargetFiles = async ({
  dbClient,
  target,
  userId,
}: {
  dbClient: Db;
  target: FileAnalysisTarget;
  userId: string;
}) => {
  if (target.linkField === 'record') {
    await assertCanAnalyzeRecordFiles({
      dbClient,
      recordId: target.recordId,
      userId,
    });

    return;
  }

  await assertCanAnalyzeReplyFiles({
    dbClient,
    recordId: target.recordId,
    replyId: target.linkId,
    userId,
  });
};
