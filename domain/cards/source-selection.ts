export const MAX_CARD_FULL_TEXT_RECORDS = 60;

export const MAX_CARD_ANALYSIS_SOURCE_RECORDS = 240;

export const CARD_ANALYSIS_CHUNK_SIZE = 30;

export const MAX_CARD_SOURCE_RECORDS = MAX_CARD_ANALYSIS_SOURCE_RECORDS;

export type CardSourceRecord = {
  date?: Date | number | string | null;
  id: string;
  tags?: { id: string; name?: string | null }[];
  text?: string | null;
};

export const uniqueCardTagIds = (
  tagIds?: Iterable<string | null | undefined>
) =>
  [
    ...new Set([...(tagIds ?? [])].map((id) => id?.trim()).filter(Boolean)),
  ] as string[];

export const recordMatchesCardTags = (
  record: Pick<CardSourceRecord, 'tags'>,
  tagIds: ReadonlySet<string>
) => {
  if (!tagIds.size) return false;
  return (record.tags ?? []).some((tag) => tagIds.has(tag.id));
};

const prefilteredCardSourceRecords = <T extends CardSourceRecord>({
  records,
  tagIds,
}: {
  records: T[];
  tagIds: Iterable<string>;
}) => {
  const selectedTagIds = new Set(uniqueCardTagIds(tagIds));
  if (!selectedTagIds.size) return [];
  // Callers prefilter records by tag in the DB query; tagIds is only the gate
  // that prevents generating cards with no selected source tags.
  return records;
};

const sampleEvenlySpacedRecords = <T extends CardSourceRecord>(
  records: T[],
  limit: number
) => {
  if (limit <= 0) return [];
  if (records.length <= limit) return records;
  if (limit === 1) return [records[0]];
  const maxIndex = records.length - 1;
  const selected: T[] = [];
  const selectedIndexes = new Set<number>();

  for (let index = 0; index < limit; index += 1) {
    const sourceIndex = Math.round((maxIndex * index) / (limit - 1));
    if (selectedIndexes.has(sourceIndex)) continue;
    selectedIndexes.add(sourceIndex);
    selected.push(records[sourceIndex]);
  }

  return selected;
};

const selectCardTimelineRecords = <T extends CardSourceRecord>({
  limit,
  records,
}: {
  limit: number;
  records: T[];
}) => {
  const resolvedLimit = Math.max(0, Math.floor(limit));
  if (!resolvedLimit) return [];
  if (records.length <= resolvedLimit) return records;

  if (resolvedLimit <= MAX_CARD_FULL_TEXT_RECORDS) {
    return records.slice(-resolvedLimit);
  }

  const recentRecordCount = Math.min(MAX_CARD_FULL_TEXT_RECORDS, resolvedLimit);
  const recentRecords = records.slice(-recentRecordCount);
  const olderRecords = records.slice(0, -recentRecordCount);

  const sampledOlderRecords = sampleEvenlySpacedRecords(
    olderRecords,
    resolvedLimit - recentRecords.length
  );

  return [...sampledOlderRecords, ...recentRecords];
};

export const selectCardSourceRecordCoverage = <T extends CardSourceRecord>({
  limit = MAX_CARD_SOURCE_RECORDS,
  records,
  tagIds,
}: {
  limit?: number;
  records: T[];
  tagIds: Iterable<string>;
}) => {
  const selectedRecords = prefilteredCardSourceRecords({ records, tagIds });

  return {
    records: selectCardTimelineRecords({ limit, records: selectedRecords }),
    totalMatchingRecords: selectedRecords.length,
  };
};

export const selectCardSourceRecords = <T extends CardSourceRecord>({
  limit = MAX_CARD_SOURCE_RECORDS,
  records,
  tagIds,
}: {
  limit?: number;
  records: T[];
  tagIds: Iterable<string>;
}) => selectCardSourceRecordCoverage({ limit, records, tagIds }).records;
