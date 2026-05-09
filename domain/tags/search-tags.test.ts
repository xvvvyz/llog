import * as searchTags from '@/domain/tags/search-tags';
import { describe, expect, test } from 'bun:test';

const tags = [
  { color: 'blue', id: 'deep-house', name: 'Deep House' },
  { color: 'green', id: 'ambient', name: 'Ambient' },
  { color: 'red', id: 'field-notes', name: 'Field Notes' },
];

describe('findExactTagId', () => {
  test('matches tag names with trimmed case-insensitive text only', () => {
    expect(searchTags.findExactTagId(tags, '  deep house  ')).toBe(
      'deep-house'
    );

    expect(searchTags.findExactTagId(tags, 'DEEP HOUSE')).toBe('deep-house');
    expect(searchTags.findExactTagId(tags, 'deep')).toBeUndefined();
    expect(searchTags.findExactTagId(tags, '   ')).toBeUndefined();
  });
});

describe('searchTags', () => {
  test('returns original tag objects for prefix matches', () => {
    expect(searchTags.searchTags(tags, 'fie')).toEqual([tags[2]]);
  });

  test('returns the original ordered list for blank queries', () => {
    expect(searchTags.searchTags(tags, '   ')).toBe(tags);
  });
});

describe('searchTagsWithIndex', () => {
  test('filters search results that are no longer present in the supplied tags', () => {
    const index = searchTags.createTagSearchIndex([
      ...tags,
      { id: 'archived', name: 'Archived' },
    ]);

    expect(
      searchTags.searchTagsWithIndex({ index, query: 'archived', tags })
    ).toEqual([]);
  });
});
