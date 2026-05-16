type RecordDraftCandidate = { id?: string; log?: { id?: string } | null };

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
      !ignoredDraftIds?.has(item.id) &&
      !outboxDraftIds?.has(item.id)
  );
