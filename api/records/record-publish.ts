import type { Db } from '@/api/middleware/db';
import * as cardActions from '@/api/cards/card-actions';
import * as recordScheduler from '@/api/records/record-scheduler';
import { notificationRecipientLogQuery } from '@/api/push/query';
import * as push from '@/api/push/web-push';
import * as recordPublish from '@/domain/records/publish';
import * as recordIdentity from '@/domain/records/identity-fields';
import * as recordStatus from '@/domain/records/status';
import * as permissions from '@/domain/teams/permissions';
import { id } from '@instantdb/admin';
import { HTTPException } from 'hono/http-exception';

const normalizeDate = (date?: string | number | Date | null) => {
  if (!date) return undefined;
  if (date instanceof Date) return date.toISOString();
  return typeof date === 'string' ? date : new Date(date).toISOString();
};

const normalizeRequiredDate = (
  date: string | number | Date,
  message = 'Invalid record date'
) => {
  const value = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(value.getTime())) throw new HTTPException(400, { message });
  return value.toISOString();
};

const isFutureDate = (date: string, now: string) =>
  new Date(date).getTime() > new Date(now).getTime();

const queryPublishableRecord = async ({
  dbClient,
  recordId,
}: {
  dbClient: Db;
  recordId: string;
}) => {
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

  return records[0];
};

const publishRecordNow = async ({
  dbClient,
  env,
  now,
  record,
  recordId,
  text,
  userId,
  contentDate,
}: {
  contentDate?: string;
  dbClient: Db;
  env: CloudflareEnv;
  now: string;
  record: NonNullable<Awaited<ReturnType<typeof queryPublishableRecord>>>;
  recordId: string;
  text: string;
  userId?: string;
}) => {
  if (!record.log?.id || !record.teamId || !record.author?.id) {
    throw new HTTPException(400, { message: 'Invalid record draft' });
  }

  await dbClient.transact(
    recordPublish.buildPublishDraftRecordTransactions({
      activityDate: now,
      activityId: id(),
      actorId: record.author.id,
      contentDate: contentDate ?? record.date ?? now,
      db: dbClient,
      logId: record.log.id,
      recordId,
      teamId: record.teamId,
      text,
    })
  );

  await cardActions.queuePublishedRecordCardRefreshes({
    dbClient,
    env,
    logId: record.log.id,
    recordTagIds: record.tags?.map((tag) => tag.id) ?? [],
  });

  const actorUserId = userId ?? record.author.user?.id;

  if (actorUserId) {
    await push.sendPushNotifications(
      env,
      push.collectRecipientSubscriptions({
        actorUserId,
        logProfiles: record.log.profiles,
        roles: record.log.team?.roles,
      }),
      push.buildRecordNotification({
        authorName: record.author.name,
        logName: record.log.name,
        recordId,
        text,
      }),
      { staleSubscriptionDb: dbClient }
    );
  }
};

const assertCanPublishRecord = ({
  record,
  userId,
}: {
  record: NonNullable<Awaited<ReturnType<typeof queryPublishableRecord>>>;
  userId: string;
}) => {
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
};

const hasPublishableContent = ({
  record,
  text,
}: {
  record: NonNullable<Awaited<ReturnType<typeof queryPublishableRecord>>>;
  text: string;
}) => !!text || !!record.files?.length || !!record.links?.length;

const cleanupRecordPublishSchedules = async ({
  env,
  exceptScheduleId,
  recordId,
}: {
  env: CloudflareEnv;
  exceptScheduleId?: string;
  recordId: string;
}) => {
  try {
    await recordScheduler.cancelRecordPublishSchedules(
      env,
      recordId,
      exceptScheduleId ? { exceptScheduleId } : undefined
    );
  } catch {
    // A stale schedule still checks the record date before publishing.
  }
};

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
  const record = await queryPublishableRecord({ dbClient, recordId });
  if (!record) throw new HTTPException(404, { message: 'Record not found' });
  assertCanPublishRecord({ record, userId });

  if (recordStatus.recordIsPublished(record)) {
    throw new HTTPException(409, { message: 'Record already published' });
  }

  const trimmedText = record.text?.trim() ?? '';

  if (
    !hasPublishableContent({ record, text: trimmedText }) ||
    !record.log?.id ||
    !record.teamId ||
    !record.author?.id
  ) {
    throw new HTTPException(400, { message: 'Invalid record draft' });
  }

  const now = new Date().toISOString();
  const contentDate = normalizeDate(record.date) ?? now;

  if (isFutureDate(contentDate, now)) {
    const schedule = await recordScheduler.scheduleRecordPublish(env, {
      publishAt: contentDate,
      recordId,
    });

    await dbClient.transact(
      dbClient.tx.records[recordId].update({
        date: contentDate,
        ...recordIdentity.getStatusFields('scheduled'),
        text: trimmedText,
      })
    );

    await cleanupRecordPublishSchedules({
      env,
      exceptScheduleId: schedule.scheduleId,
      recordId,
    });

    return { scheduledFor: contentDate, status: 'scheduled' as const };
  }

  await publishRecordNow({
    dbClient,
    env,
    now,
    record,
    recordId,
    text: trimmedText,
    userId,
  });

  if (recordStatus.recordIsScheduled(record)) {
    await cleanupRecordPublishSchedules({ env, recordId });
  }

  return { status: 'published' as const };
};

export const updateScheduledRecordSchedule = async ({
  date,
  dbClient,
  env,
  recordId,
  text,
  userId,
}: {
  date: string | number | Date;
  dbClient: Db;
  env: CloudflareEnv;
  recordId?: string;
  text?: string;
  userId: string;
}) => {
  if (!recordId) throw new HTTPException(400, { message: 'Invalid request' });
  const record = await queryPublishableRecord({ dbClient, recordId });
  if (!record) throw new HTTPException(404, { message: 'Record not found' });
  assertCanPublishRecord({ record, userId });

  if (!recordStatus.recordIsScheduled(record)) {
    throw new HTTPException(409, { message: 'Record is not scheduled' });
  }

  const contentDate = normalizeRequiredDate(date);
  const trimmedText = text == null ? (record.text?.trim() ?? '') : text.trim();

  if (
    !hasPublishableContent({ record, text: trimmedText }) ||
    !record.log?.id ||
    !record.teamId ||
    !record.author?.id
  ) {
    throw new HTTPException(400, { message: 'Invalid record draft' });
  }

  const now = new Date().toISOString();

  if (isFutureDate(contentDate, now)) {
    const schedule = await recordScheduler.scheduleRecordPublish(env, {
      publishAt: contentDate,
      recordId,
    });

    await dbClient.transact(
      dbClient.tx.records[recordId].update({
        date: contentDate,
        ...recordIdentity.getStatusFields('scheduled'),
        text: trimmedText,
      })
    );

    await cleanupRecordPublishSchedules({
      env,
      exceptScheduleId: schedule.scheduleId,
      recordId,
    });

    return { scheduledFor: contentDate, status: 'scheduled' as const };
  }

  await publishRecordNow({
    contentDate,
    dbClient,
    env,
    now,
    record,
    recordId,
    text: trimmedText,
    userId,
  });

  await cleanupRecordPublishSchedules({ env, recordId });
  return { status: 'published' as const };
};

export const publishScheduledRecord = async ({
  dbClient,
  env,
  publishAt,
  recordId,
}: {
  dbClient: Db;
  env: CloudflareEnv;
  publishAt: string;
  recordId: string;
}) => {
  const record = await queryPublishableRecord({ dbClient, recordId });
  if (!record) return { skipped: true as const };

  if (!recordStatus.recordIsScheduled(record)) {
    return { skipped: true as const };
  }

  const recordDate = normalizeDate(record.date);

  if (!recordDate || recordDate !== publishAt) {
    return { skipped: true as const };
  }

  const trimmedText = record.text?.trim() ?? '';

  const hasContent =
    !!trimmedText || !!record.files?.length || !!record.links?.length;

  if (!hasContent || !record.log?.id || !record.teamId || !record.author?.id) {
    return { skipped: true as const };
  }

  const now = new Date().toISOString();

  if (isFutureDate(recordDate, now)) {
    await recordScheduler.scheduleRecordPublish(env, { publishAt, recordId });
    return { skipped: true as const };
  }

  await publishRecordNow({
    dbClient,
    env,
    now,
    record,
    recordId,
    text: trimmedText,
  });

  return { status: 'published' as const };
};
