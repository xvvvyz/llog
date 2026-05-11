import * as recordIdentity from '@/domain/records/identity-fields';
import schema from '@/instant.schema';
import type { db as clientDb } from '@/lib/db';
import type { TransactionChunk } from '@instantdb/react-native';

type Transaction = TransactionChunk<
  typeof schema,
  keyof (typeof schema)['entities']
>;

type DbWithTransactions = { tx: typeof clientDb.tx };
const optionalDate = (date?: string) => (date ? { date } : {});

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
  contentDate?: string;
  db: DbWithTransactions;
  logId: string;
  recordId: string;
  text: string;
  teamId: string;
}): Transaction[] => [
  db.tx.records[recordId].update({
    ...optionalDate(contentDate),
    ...recordIdentity.getPublishedLogRecordWhere(logId),
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
  db,
  logId,
  now,
  recordId,
  text,
  teamId,
}: {
  activityId: string;
  authorId: string;
  db: DbWithTransactions;
  logId: string;
  now: string;
  recordId: string;
  text?: string | null;
  teamId: string;
}): Transaction[] => [
  db.tx.records[recordId]
    .update({
      ...recordIdentity.getRecordIdentityFields({ authorId, logId }),
      date: now,
      isDraft: false,
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
  contentDate,
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
  contentDate?: string;
  db: DbWithTransactions;
  logId: string;
  recordId: string;
  replyId: string;
  text: string;
  teamId: string;
}): Transaction[] => [
  db.tx.replies[replyId].update({
    ...optionalDate(contentDate),
    isDraft: false,
    text,
  }),
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
