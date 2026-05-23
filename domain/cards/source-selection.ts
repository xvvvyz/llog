import type { Record as LlogRecord, Tag } from '@/instant.entities';

export const MAX_CARD_FULL_TEXT_RECORDS = 60;

export const MAX_CARD_ANALYSIS_SOURCE_RECORDS = 240;

export const CARD_ANALYSIS_CHUNK_SIZE = 20;

export const MAX_CARD_SOURCE_RECORDS = MAX_CARD_ANALYSIS_SOURCE_RECORDS;

export const MAX_CARD_PROMPT_SUGGESTION_RECORDS = 40;

export const CARD_PROMPT_SUGGESTION_RECENT_RECORDS = 20;

export type CardSourceRecord = Pick<LlogRecord, 'id'> &
  Partial<Pick<LlogRecord, 'date' | 'text'>> & {
    tags?: (Pick<Tag, 'id'> & Partial<Pick<Tag, 'name'>>)[];
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

const latestRecordForTag = <T extends CardSourceRecord>(
  records: T[],
  tagId: string
) => {
  for (let index = records.length - 1; index >= 0; index -= 1) {
    const record = records[index];
    if (record?.tags?.some((tag) => tag.id === tagId)) return record;
  }
};

const sortRecordsBySourceOrder = <T extends CardSourceRecord>(
  sourceRecords: T[],
  records: T[]
) => {
  const orderById = new Map<string, number>();

  sourceRecords.forEach((record, index) => {
    if (!orderById.has(record.id)) orderById.set(record.id, index);
  });

  return [...records].sort(
    (left, right) =>
      (orderById.get(left.id) ?? 0) - (orderById.get(right.id) ?? 0)
  );
};

const selectCardTimelineRecords = <T extends CardSourceRecord>({
  limit,
  records,
}: {
  limit: number;
  records: T[];
}) => {
  const resolvedLimit = Math.max(0, Math.floor(limit));
  if (!Number.isFinite(resolvedLimit)) return records;
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

// Prompt suggestions need breadth, not exhaustive evidence: cover each selected
// tag, keep recent context, sample older history, then restore source order.
export const selectCardPromptSuggestionRecords = <T extends CardSourceRecord>({
  limit = MAX_CARD_PROMPT_SUGGESTION_RECORDS,
  records,
  tagIds,
}: {
  limit?: number;
  records: T[];
  tagIds: Iterable<string>;
}) => {
  const selectedTagIds = uniqueCardTagIds(tagIds);
  const resolvedLimit = Math.max(0, Math.floor(limit));
  if (!selectedTagIds.length || !resolvedLimit) return [];
  const selectedTagIdSet = new Set(selectedTagIds);

  const matchingRecords = records.filter((record) =>
    recordMatchesCardTags(record, selectedTagIdSet)
  );

  const selectedRecords: T[] = [];
  const selectedRecordIds = new Set<string>();

  const addRecord = (record?: T) => {
    if (
      !record ||
      selectedRecords.length >= resolvedLimit ||
      selectedRecordIds.has(record.id)
    ) {
      return;
    }

    selectedRecords.push(record);
    selectedRecordIds.add(record.id);
  };

  for (const tagId of selectedTagIds) {
    addRecord(latestRecordForTag(matchingRecords, tagId));
  }

  const recentRecords = matchingRecords.slice(
    -Math.min(CARD_PROMPT_SUGGESTION_RECENT_RECORDS, resolvedLimit)
  );

  for (const record of recentRecords) addRecord(record);
  const remainingCount = resolvedLimit - selectedRecords.length;

  const olderRecords = matchingRecords
    .slice(0, -CARD_PROMPT_SUGGESTION_RECENT_RECORDS)
    .filter((record) => !selectedRecordIds.has(record.id));

  for (const record of sampleEvenlySpacedRecords(
    olderRecords,
    remainingCount
  )) {
    addRecord(record);
  }

  return sortRecordsBySourceOrder(matchingRecords, selectedRecords);
};
