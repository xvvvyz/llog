import * as recordIdentity from '@/domain/records/identity-fields';
import schema from '@/instant.schema';
import type { db as clientDb } from '@/lib/db';
import type { TransactionChunk } from '@instantdb/react-native';

type Transaction = TransactionChunk<
  typeof schema,
  keyof (typeof schema)['entities']
>;

type DbWithTransactions = { tx: typeof clientDb.tx };

const normalizeDate = (date?: string | number) => {
  if (!date) return undefined;
  return typeof date === 'string' ? date : new Date(date).toISOString();
};

const optionalDate = (date?: string | number) => {
  const normalizedDate = normalizeDate(date);
  return normalizedDate ? { date: normalizedDate } : {};
};

export const buildRecordPublishedActivityTransaction = ({
  activityId,
  actorId,
  db,
  logId,
  now,
  recordId,
  teamId,
}: {
  activityId: string;
  actorId: string;
  db: DbWithTransactions;
  logId: string;
  now: string;
  recordId: string;
  teamId: string;
}) =>
  db.tx.activities[activityId]
    .update({ date: now, teamId, type: 'record_published' })
    .link({ actor: actorId, log: logId, record: recordId, team: teamId });

export const buildPublishDraftRecordTransactions = ({
  activityId,
  activityDate,
  actorId,
  contentDate,
  db,
  logId,
  recordId,
  text,
  teamId,
}: {
  activityId: string;
  activityDate: string;
  actorId: string;
  contentDate?: string | number;
  db: DbWithTransactions;
  logId: string;
  recordId: string;
  text: string;
  teamId: string;
}): Transaction[] => [
  db.tx.records[recordId].update({
    ...optionalDate(contentDate),
    ...recordIdentity.getRecordIdentityFields({ authorId: actorId, logId }),
    ...recordIdentity.getStatusFields('published'),
    text,
  }),
  buildRecordPublishedActivityTransaction({
    activityId,
    actorId,
    db,
    logId,
    now: activityDate,
    recordId,
    teamId,
  }),
];

export const buildCreatePublishedRecordTransactions = ({
  activityId,
  authorId,
  contentDate,
  db,
  isPinned,
  logId,
  now,
  recordId,
  text,
  teamId,
}: {
  activityId: string;
  authorId: string;
  contentDate?: string | number;
  db: DbWithTransactions;
  isPinned?: boolean;
  logId: string;
  now: string;
  recordId: string;
  text?: string | null;
  teamId: string;
}): Transaction[] => [
  db.tx.records[recordId]
    .update({
      ...recordIdentity.getRecordIdentityFields({ authorId, logId }),
      date: normalizeDate(contentDate) ?? now,
      ...recordIdentity.getStatusFields('published'),
      ...(isPinned ? { isPinned } : {}),
      teamId,
      ...(text != null ? { text } : {}),
    })
    .link({ author: authorId, log: logId }),
  buildRecordPublishedActivityTransaction({
    activityId,
    actorId: authorId,
    db,
    logId,
    now,
    recordId,
    teamId,
  }),
];

export const buildReplyPostedActivityTransaction = ({
  activityId,
  actorId,
  db,
  logId,
  now,
  recordId,
  replyId,
  teamId,
}: {
  activityId: string;
  actorId: string;
  db: DbWithTransactions;
  logId: string;
  now: string;
  recordId: string;
  replyId: string;
  teamId: string;
}) =>
  db.tx.activities[activityId]
    .update({ date: now, teamId, type: 'reply_posted' })
    .link({
      actor: actorId,
      log: logId,
      record: recordId,
      reply: replyId,
      team: teamId,
    });

export const buildPublishDraftReplyTransactions = ({
  activityId,
  activityDate,
  actorId,
  db,
  logId,
  recordId,
  replyId,
  text,
  teamId,
}: {
  activityId: string;
  activityDate: string;
  actorId: string;
  db: DbWithTransactions;
  logId: string;
  recordId: string;
  replyId: string;
  text: string;
  teamId: string;
}): Transaction[] => [
  db.tx.replies[replyId].update({ date: activityDate, isDraft: false, text }),
  buildReplyPostedActivityTransaction({
    activityId,
    actorId,
    db,
    logId,
    now: activityDate,
    recordId,
    replyId,
    teamId,
  }),
];

export const buildCreatePublishedReplyTransactions = ({
  activityId,
  authorId,
  db,
  logId,
  now,
  recordId,
  replyId,
  text,
  teamId,
}: {
  activityId: string;
  authorId: string;
  db: DbWithTransactions;
  logId: string;
  now: string;
  recordId: string;
  replyId: string;
  text: string;
  teamId: string;
}): Transaction[] => [
  db.tx.replies[replyId]
    .update({ date: now, isDraft: false, teamId, text })
    .link({ author: authorId, record: recordId }),
  buildReplyPostedActivityTransaction({
    activityId,
    actorId: authorId,
    db,
    logId,
    now,
    recordId,
    replyId,
    teamId,
  }),
];
