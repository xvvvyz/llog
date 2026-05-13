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
          authorName: 'Fóo',
          logName: 'Foo Log',
          tagItems: [{ color: 1, id: 'tag-1', name: 'Foo', order: 0 }],
          type: 'record',
        },
        { author: ['foo'], log: ['foo'], tag: ['foo'] }
      )
    ).toBe(true);
  });

  test('matches log filters', () => {
    expect(
      queryFilters.matchesSearchFilters(
        {
          logName: 'Foo Log',
          tagItems: [{ color: 1, id: 'tag-1', name: 'Foo', order: 0 }],
          type: 'log',
        },
        { ...emptyFilters(), log: ['foo'] }
      )
    ).toBe(true);
  });
});

describe('getMatchingSearchTags', () => {
  test('matches tag chips', () => {
    const tags = [
      { color: 1, id: 'tag-foo', name: 'Foo', order: 0 },
      { color: 2, id: 'tag-bar', name: 'Bar', order: 1 },
    ];

    expect(queryFilters.getMatchingSearchTags(tags, ['tag-bar'])).toEqual([
      tags[1],
    ]);

    expect(queryFilters.getMatchingSearchTags(tags, ['foo'])).toEqual([
      tags[0],
    ]);
  });
});
