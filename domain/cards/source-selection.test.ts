import * as sourceSelection from '@/domain/cards/source-selection';
import { describe, expect, test } from 'bun:test';

const records = [
  {
    date: '2026-01-01T00:00:00.000Z',
    id: 'record-1',
    tags: [{ id: 'tag-a' }],
    text: 'first',
  },
  {
    date: '2026-01-02T00:00:00.000Z',
    id: 'record-2',
    tags: [{ id: 'tag-a' }, { id: 'tag-b' }],
    text: 'second',
  },
  {
    date: '2026-01-03T00:00:00.000Z',
    id: 'record-3',
    tags: [{ id: 'tag-b' }],
    text: 'third',
  },
];

const manyRecords = Array.from(
  { length: sourceSelection.MAX_CARD_FULL_TEXT_RECORDS + 10 },
  (_, index) => ({
    date: new Date(Date.UTC(2026, 0, index + 1)).toISOString(),
    id: `many-${index + 1}`,
    isDraft: false,
    tags: [{ id: 'tag-a' }],
    text: `entry ${index + 1}`,
  })
);

const promptSuggestionRecords = Array.from({ length: 45 }, (_, index) => {
  const tagId = index === 1 ? 'tag-b' : index === 2 ? 'tag-c' : 'tag-a';

  return {
    date: new Date(Date.UTC(2026, 0, index + 1)).toISOString(),
    id: index === 1 ? 'rare-b' : index === 2 ? 'rare-c' : `prompt-${index + 1}`,
    tags: [{ id: tagId }],
    text: `prompt entry ${index + 1}`,
  };
});

describe('card sources', () => {
  test('uses provided order', () => {
    expect(
      sourceSelection
        .selectCardSourceRecords({ records, tagIds: ['tag-a'] })
        .map((record) => record.id)
    ).toEqual(['record-1', 'record-2', 'record-3']);
  });

  test('keeps prefiltered records', () => {
    expect(
      sourceSelection
        .selectCardSourceRecords({ records, tagIds: ['tag-a'] })
        .map((record) => record.id)
    ).toContain('record-3');
  });

  test('limits newest', () => {
    expect(
      sourceSelection
        .selectCardSourceRecords({ limit: 1, records, tagIds: ['tag-a'] })
        .map((record) => record.id)
    ).toEqual(['record-3']);
  });

  test('samples older history', () => {
    const selected = sourceSelection
      .selectCardSourceRecords({
        limit: sourceSelection.MAX_CARD_FULL_TEXT_RECORDS + 2,
        records: manyRecords,
        tagIds: ['tag-a'],
      })
      .map((record) => record.id);

    expect(selected).toHaveLength(
      sourceSelection.MAX_CARD_FULL_TEXT_RECORDS + 2
    );

    expect(selected.slice(0, 2)).toEqual(['many-1', 'many-10']);

    expect(selected.slice(-sourceSelection.MAX_CARD_FULL_TEXT_RECORDS)).toEqual(
      Array.from(
        { length: sourceSelection.MAX_CARD_FULL_TEXT_RECORDS },
        (_, index) => `many-${index + 11}`
      )
    );
  });

  test('returns coverage count', () => {
    const selection = sourceSelection.selectCardSourceRecordCoverage({
      limit: 5,
      records: manyRecords,
      tagIds: ['tag-a'],
    });

    expect(selection.records).toHaveLength(5);
    expect(selection.totalMatchingRecords).toBe(manyRecords.length);
  });

  test('requires tags', () => {
    expect(
      sourceSelection.selectCardSourceRecords({ records, tagIds: [] })
    ).toEqual([]);
  });

  test('selects suggestion coverage', () => {
    const selected = sourceSelection.selectCardPromptSuggestionRecords({
      records: promptSuggestionRecords,
      tagIds: ['tag-a', 'tag-b', 'tag-c'],
    });

    const selectedIds = selected.map((record) => record.id);

    const selectedIndexes = selected.map((record) =>
      promptSuggestionRecords.findIndex((source) => source.id === record.id)
    );

    expect(selected).toHaveLength(
      sourceSelection.MAX_CARD_PROMPT_SUGGESTION_RECORDS
    );

    expect(selectedIds).toContain('rare-b');
    expect(selectedIds).toContain('rare-c');

    expect(
      selectedIds.slice(-sourceSelection.CARD_PROMPT_SUGGESTION_RECENT_RECORDS)
    ).toEqual(
      Array.from(
        { length: sourceSelection.CARD_PROMPT_SUGGESTION_RECENT_RECORDS },
        (_, index) => `prompt-${index + 26}`
      )
    );

    expect(selectedIndexes).toEqual(
      [...selectedIndexes].sort((left, right) => left - right)
    );
  });

  test('filters suggestion tags', () => {
    expect(
      sourceSelection
        .selectCardPromptSuggestionRecords({
          records: [
            {
              date: '2026-01-01T00:00:00.000Z',
              id: 'selected',
              tags: [{ id: 'tag-a' }],
              text: 'selected',
            },
            {
              date: '2026-01-02T00:00:00.000Z',
              id: 'ignored',
              tags: [{ id: 'tag-x' }],
              text: 'ignored',
            },
          ],
          tagIds: ['tag-a'],
        })
        .map((record) => record.id)
    ).toEqual(['selected']);
  });
});
