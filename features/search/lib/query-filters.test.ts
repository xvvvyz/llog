import { describe, expect, test } from 'bun:test';
import * as queryFilters from '@/features/search/lib/query-filters';
import type { ParsedSearchQuery } from '@/lib/search';

const emptyFilters = (): ParsedSearchQuery['filters'] => ({
  author: [],
  log: [],
  tag: [],
});

describe('matchesSearchFilters', () => {
  test('matches record filters', () => {
    expect(
      queryFilters.matchesSearchFilters(
        {
          authorName: 'Mémber',
          logName: 'Daily Log',
          tagItems: [{ color: 1, id: 'tag-1', name: 'Ideas', order: 0 }],
          type: 'record',
        },
        { author: ['member'], log: ['daily'], tag: ['ideas'] }
      )
    ).toBe(true);
  });

  test('matches log filters', () => {
    expect(
      queryFilters.matchesSearchFilters(
        {
          logName: 'Daily Log',
          tagItems: [{ color: 1, id: 'tag-1', name: 'Ideas', order: 0 }],
          type: 'log',
        },
        { ...emptyFilters(), log: ['daily'] }
      )
    ).toBe(true);
  });
});

describe('getMatchingSearchTags', () => {
  test('matches tag chips', () => {
    const tags = [
      { color: 1, id: 'tag-ideas', name: 'Ideas', order: 0 },
      { color: 2, id: 'tag-reading', name: 'Reading', order: 1 },
    ];

    expect(queryFilters.getMatchingSearchTags(tags, ['tag-reading'])).toEqual([
      tags[1],
    ]);

    expect(queryFilters.getMatchingSearchTags(tags, ['ideas'])).toEqual([
      tags[0],
    ]);
  });
});
