type DbWithTransactions = { tx: any };
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
}): any[] => [
  db.tx.records[recordId].update({
    ...optionalDate(contentDate),
    isDraft: false,
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
}): any[] => [
  db.tx.records[recordId]
    .update({
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
}): any[] => [
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
}): any[] => [
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
