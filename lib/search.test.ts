import { describe, expect, test } from 'bun:test';
import * as search2 from '@/lib/search';

describe('normalizeSearchText', () => {
  test('normalizes text', () => {
    expect(search2.normalizeSearchText('  FÓO  ')).toBe('foo');
    expect(search2.normalizeSearchText('Bär')).toBe('bar');
  });
});

describe('createSearchIndex', () => {
  test('matches accents', () => {
    const index = search2.createSearchIndex({
      documents: [{ id: '1', text: 'Fóo y Bär' }],
      fields: ['text'],
      storeFields: ['text'],
    });

    expect(index.search('foo')).toMatchObject([{ id: '1' }]);
    expect(index.search('bar')).toMatchObject([{ id: '1' }]);
  });
});

describe('parseSearchQuery', () => {
  test('parses filters', () => {
    expect(
      search2.parseSearchQuery('tag:foo log:"Foo Log" author:fóo todo')
    ).toEqual({
      filters: { author: ['fóo'], log: ['Foo Log'], tag: ['foo'] },
      text: 'todo',
    });
  });

  test('keeps unknown tokens', () => {
    expect(
      search2.parseSearchQuery('https://example.com tag: author:foo')
    ).toEqual({
      filters: { author: ['foo'], log: [], tag: [] },
      text: 'https://example.com tag:',
    });
  });
});
