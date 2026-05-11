export const getRecordIdentityFields = ({
  authorId,
  logId,
}: {
  authorId: string;
  logId: string;
}) => ({ authorId, logId });

export const getDraftRecordLookupWhere = ({
  authorId,
  logId,
}: {
  authorId: string;
  logId: string;
}) => ({ ...getRecordIdentityFields({ authorId, logId }), isDraft: true });

export const getPublishedLogRecordWhere = (logId: string) => ({
  isDraft: false,
  logId,
});
