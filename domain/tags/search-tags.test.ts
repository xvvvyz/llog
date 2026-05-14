import * as searchTags from '@/domain/tags/search-tags';
import { describe, expect, test } from 'bun:test';

const tags = [
  { color: 'blue', id: 'morning-notes', name: 'Morning Notes' },
  { color: 'green', id: 'field-notes', name: 'Field Notes' },
  { color: 'red', id: 'release-notes', name: 'Release Notes' },
];

describe('findExactTagId', () => {
  test('matches exact names', () => {
    expect(searchTags.findExactTagId(tags, '  morning notes  ')).toBe(
      'morning-notes'
    );

    expect(searchTags.findExactTagId(tags, 'MORNING NOTES')).toBe(
      'morning-notes'
    );

    expect(searchTags.findExactTagId(tags, 'morning')).toBeUndefined();
    expect(searchTags.findExactTagId(tags, '   ')).toBeUndefined();
  });
});

describe('searchTags', () => {
  test('matches prefixes', () => {
    expect(searchTags.searchTags(tags, 'rel')).toEqual([tags[2]]);
  });

  test('keeps blank queries', () => {
    expect(searchTags.searchTags(tags, '   ')).toBe(tags);
  });
});

describe('searchTagsWithIndex', () => {
  test('drops stale index results', () => {
    const index = searchTags.createTagSearchIndex([
      ...tags,
      { id: 'archived-note', name: 'Archived Note' },
    ]);

    expect(
      searchTags.searchTagsWithIndex({ index, query: 'archived', tags })
    ).toEqual([]);
  });
});
