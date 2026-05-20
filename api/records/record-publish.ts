import type { Db } from '@/api/middleware/db';
import * as cardActions from '@/api/cards/card-actions';
import { notificationRecipientLogQuery } from '@/api/push/query';
import * as push from '@/api/push/web-push';
import * as recordPublish from '@/domain/records/publish';
import * as permissions from '@/domain/teams/permissions';
import { id } from '@instantdb/admin';
import { HTTPException } from 'hono/http-exception';

export const publishDraftRecord = async ({
  dbClient,
  env,
  recordId,
  userId,
}: {
  dbClient: Db;
  env: CloudflareEnv;
  recordId?: string;
  userId: string;
}) => {
  if (!recordId) throw new HTTPException(400, { message: 'Invalid request' });

  const { records } = await dbClient.query({
    records: {
      $: { where: { id: recordId } },
      author: {
        $: { fields: ['id', 'name'] },
        user: { $: { fields: ['id'] } },
      },
      log: { $: { fields: ['id', 'name'] }, ...notificationRecipientLogQuery },
      files: { $: { fields: ['id'] } },
      links: { $: { fields: ['id'] } },
      tags: { $: { fields: ['id'] } },
    },
  });

  const record = records[0];
  if (!record) throw new HTTPException(404, { message: 'Record not found' });

  const actorRole = record.log?.team?.roles?.find(
    (role) => role.userId === userId
  )?.role;

  const isAuthor = record.author?.user?.id === userId;

  const isLogMember = !!record.log?.profiles?.some(
    (profile) => profile.user?.id === userId
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

  await dbClient.transact(
    recordPublish.buildPublishDraftRecordTransactions({
      activityDate: now,
      activityId: id(),
      actorId: record.author.id,
      contentDate: record.date ?? now,
      db: dbClient,
      logId: record.log.id,
      recordId,
      teamId: record.teamId,
      text: trimmedText,
    })
  );

  await cardActions.queuePublishedRecordCardRefreshes({
    dbClient,
    env,
    logId: record.log.id,
    recordTagIds: record.tags?.map((tag) => tag.id) ?? [],
  });

  await push.sendPushNotifications(
    env,
    push.collectRecipientSubscriptions({
      actorUserId: userId,
      logProfiles: record.log.profiles,
      roles: record.log.team?.roles,
    }),
    push.buildRecordNotification({
      authorName: record.author.name,
      logName: record.log.name,
      recordId,
      text: trimmedText,
    }),
    { staleSubscriptionDb: dbClient }
  );
};
