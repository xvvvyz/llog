import { describe, expect, test } from 'bun:test';
import * as search2 from '@/lib/search';

describe('normalizeSearchText', () => {
  test('normalizes case, whitespace, and diacritics', () => {
    expect(search2.normalizeSearchText('  MÉXICO  ')).toBe('mexico');
    expect(search2.normalizeSearchText('Estás')).toBe('estas');
  });
});

describe('createSearchIndex', () => {
  test('matches accent-insensitive queries', () => {
    const index = search2.createSearchIndex({
      documents: [{ id: '1', text: 'México y Estás' }],
      fields: ['text'],
      storeFields: ['text'],
    });

    expect(index.search('mexico')).toMatchObject([{ id: '1' }]);
    expect(index.search('estas')).toMatchObject([{ id: '1' }]);
  });
});

describe('parseSearchQuery', () => {
  test('extracts supported filters and free text', () => {
    expect(
      search2.parseSearchQuery('tag:work log:"Daily Notes" author:cáde todo')
    ).toEqual({
      filters: { author: ['cáde'], log: ['Daily Notes'], tag: ['work'] },
      text: 'todo',
    });
  });

  test('leaves unknown or empty tokens in free text', () => {
    expect(
      search2.parseSearchQuery('https://example.com tag: author:cade')
    ).toEqual({
      filters: { author: ['cade'], log: [], tag: [] },
      text: 'https://example.com tag:',
    });
  });
});
