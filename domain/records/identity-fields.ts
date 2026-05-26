import type { RecordStatus } from '@/domain/records/status';

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
}) => ({
  ...getRecordIdentityFields({ authorId, logId }),
  status: 'draft' as const,
});

export const getPublishedLogRecordWhere = (logId: string) => ({
  logId,
  status: 'published' as const,
});

export const getStatusFields = (status: RecordStatus) => ({ status });
