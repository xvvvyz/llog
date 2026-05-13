import * as searchTags from '@/domain/tags/search-tags';
import { describe, expect, test } from 'bun:test';

const tags = [
  { color: 'blue', id: 'foo-bar', name: 'Foo Bar' },
  { color: 'green', id: 'bar-baz', name: 'Bar Baz' },
  { color: 'red', id: 'baz-qux', name: 'Baz Qux' },
];

describe('findExactTagId', () => {
  test('matches exact names', () => {
    expect(searchTags.findExactTagId(tags, '  foo bar  ')).toBe('foo-bar');
    expect(searchTags.findExactTagId(tags, 'FOO BAR')).toBe('foo-bar');
    expect(searchTags.findExactTagId(tags, 'foo')).toBeUndefined();
    expect(searchTags.findExactTagId(tags, '   ')).toBeUndefined();
  });
});

describe('searchTags', () => {
  test('matches prefixes', () => {
    expect(searchTags.searchTags(tags, 'qu')).toEqual([tags[2]]);
  });

  test('keeps blank queries', () => {
    expect(searchTags.searchTags(tags, '   ')).toBe(tags);
  });
});

describe('searchTagsWithIndex', () => {
  test('drops stale index results', () => {
    const index = searchTags.createTagSearchIndex([
      ...tags,
      { id: 'corge', name: 'Corge' },
    ]);

    expect(
      searchTags.searchTagsWithIndex({ index, query: 'corge', tags })
    ).toEqual([]);
  });
});
