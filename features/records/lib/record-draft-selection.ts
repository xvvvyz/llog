import * as recordStatus from '@/domain/records/status';

type RecordDraftCandidate = recordStatus.OptionalRecordStatusSource & {
  id?: string;
  log?: { id?: string } | null;
};

export const findReusableRecordDraft = <T extends RecordDraftCandidate>({
  ignoredDraftIds,
  logId,
  outboxDraftIds,
  records,
}: {
  ignoredDraftIds?: ReadonlySet<string>;
  logId?: string;
  outboxDraftIds?: ReadonlySet<string>;
  records: T[];
}) =>
  records.find(
    (item) =>
      item.id &&
      item.log?.id === logId &&
      recordStatus.getOptionalRecordStatus(item) === 'draft' &&
      !ignoredDraftIds?.has(item.id) &&
      !outboxDraftIds?.has(item.id)
  );
