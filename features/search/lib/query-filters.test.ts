import { describe, expect, test } from 'bun:test';
import * as queryFilters from '@/features/search/lib/query-filters';
import type { ParsedSearchQuery } from '@/lib/search';

const emptyFilters = (): ParsedSearchQuery['filters'] => ({
  author: [],
  log: [],
  tag: [],
});

describe('matchesSearchFilters', () => {
  test('matches record filters by log, tag, and author text', () => {
    expect(
      queryFilters.matchesSearchFilters(
        {
          authorName: 'Cáde',
          logName: 'Daily Notes',
          tagItems: [{ color: 1, id: 'tag-1', name: 'Work', order: 0 }],
          type: 'record',
        },
        { author: ['cade'], log: ['daily'], tag: ['wor'] }
      )
    ).toBe(true);
  });

  test('matches log results when a log filter is present', () => {
    expect(
      queryFilters.matchesSearchFilters(
        {
          logName: 'Daily Notes',
          tagItems: [{ color: 1, id: 'tag-1', name: 'Work', order: 0 }],
          type: 'log',
        },
        { ...emptyFilters(), log: ['daily'] }
      )
    ).toBe(true);
  });
});

describe('getMatchingSearchTags', () => {
  test('returns matching tag filter chips by name or id', () => {
    const tags = [
      { color: 1, id: 'tag-work', name: 'Work', order: 0 },
      { color: 2, id: 'tag-home', name: 'Home', order: 1 },
    ];

    expect(queryFilters.getMatchingSearchTags(tags, ['tag-home'])).toEqual([
      tags[1],
    ]);

    expect(queryFilters.getMatchingSearchTags(tags, ['wor'])).toEqual([
      tags[0],
    ]);
  });
});
