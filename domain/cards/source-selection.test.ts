import * as sourceSelection from '@/domain/cards/source-selection';
import { describe, expect, test } from 'bun:test';
import * as separationAnxietyFixture from '@/domain/cards/separation-anxiety-fixture';

const manyRecords = separationAnxietyFixture.separationRecordsForCount(
  sourceSelection.MAX_CARD_FULL_TEXT_RECORDS + 10
);

const promptSuggestionRecords = separationAnxietyFixture
  .separationRecordsForCount(45)
  .map((record, index) => {
    const tagId = index === 1 ? 'tag-b' : index === 2 ? 'tag-c' : 'tag-a';

    return {
      ...record,
      id:
        index === 1 ? 'rare-b' : index === 2 ? 'rare-c' : `prompt-${index + 1}`,
      tags: [{ id: tagId }],
    };
  });

describe('card sources', () => {
  test('uses provided order', () => {
    expect(
      sourceSelection
        .selectCardSourceRecords({
          records: separationAnxietyFixture.separationAnxietyRecords,
          tagIds: separationAnxietyFixture.separationSessionTagIds,
        })
        .map((record) => record.id)
    ).toEqual(
      separationAnxietyFixture.separationAnxietyRecords.map(
        (record) => record.id
      )
    );
  });

  test('limits newest', () => {
    expect(
      sourceSelection
        .selectCardSourceRecords({
          limit: 3,
          records: separationAnxietyFixture.separationAnxietyRecords,
          tagIds: separationAnxietyFixture.separationSessionTagIds,
        })
        .map((record) => record.id)
    ).toEqual(
      separationAnxietyFixture.separationAnxietyRecords
        .slice(-3)
        .map((record) => record.id)
    );
  });

  test('samples older history', () => {
    const selected = sourceSelection
      .selectCardSourceRecords({
        limit: sourceSelection.MAX_CARD_FULL_TEXT_RECORDS + 2,
        records: manyRecords,
        tagIds: separationAnxietyFixture.separationSessionTagIds,
      })
      .map((record) => record.id);

    expect(selected).toHaveLength(
      sourceSelection.MAX_CARD_FULL_TEXT_RECORDS + 2
    );

    expect(selected.slice(0, 2)).toEqual(['session-1', 'session-10']);

    expect(selected.slice(-sourceSelection.MAX_CARD_FULL_TEXT_RECORDS)).toEqual(
      Array.from(
        { length: sourceSelection.MAX_CARD_FULL_TEXT_RECORDS },
        (_, index) => `session-${index + 11}`
      )
    );
  });

  test('returns coverage', () => {
    const selection = sourceSelection.selectCardSourceRecordCoverage({
      limit: 5,
      records: manyRecords,
      tagIds: separationAnxietyFixture.separationSessionTagIds,
    });

    expect(selection.records).toHaveLength(5);
    expect(selection.totalMatchingRecords).toBe(manyRecords.length);

    const capped = sourceSelection.selectCardSourceRecordCoverage({
      records: separationAnxietyFixture.separationRecordsForCount(300),
      tagIds: separationAnxietyFixture.separationSessionTagIds,
    });

    expect(capped.records).toHaveLength(
      sourceSelection.MAX_CARD_ANALYSIS_SOURCE_RECORDS
    );

    expect(capped.totalMatchingRecords).toBe(300);
  });

  test('requires tags', () => {
    expect(
      sourceSelection.selectCardSourceRecords({
        records: separationAnxietyFixture.separationAnxietyRecords,
        tagIds: [],
      })
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
              ...separationAnxietyFixture.separationAnxietyRecords[0],
              id: 'selected',
              tags: [{ id: 'tag-a' }],
            },
            {
              ...separationAnxietyFixture.separationAnxietyRecords[1],
              id: 'ignored',
              tags: [{ id: 'tag-x' }],
            },
          ],
          tagIds: ['tag-a'],
        })
        .map((record) => record.id)
    ).toEqual(['selected']);
  });
});
