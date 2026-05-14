import { describe, expect, test } from 'bun:test';
import * as searchLib from '@/lib/search';

describe('normalizeSearchText', () => {
  test('normalizes text', () => {
    expect(searchLib.normalizeSearchText('  CAFÉ  ')).toBe('cafe');
    expect(searchLib.normalizeSearchText('Résumé')).toBe('resume');
  });
});

describe('createSearchIndex', () => {
  test('matches accents', () => {
    const index = searchLib.createSearchIndex({
      documents: [{ id: '1', text: 'Café résumé' }],
      fields: ['text'],
      storeFields: ['text'],
    });

    expect(index.search('cafe')).toMatchObject([{ id: '1' }]);
    expect(index.search('resume')).toMatchObject([{ id: '1' }]);
  });
});

describe('parseSearchQuery', () => {
  test('parses filters', () => {
    expect(
      searchLib.parseSearchQuery('tag:ideas log:"Daily Log" author:cadé todo')
    ).toEqual({
      filters: { author: ['cadé'], log: ['Daily Log'], tag: ['ideas'] },
      text: 'todo',
    });
  });

  test('keeps unknown tokens', () => {
    expect(
      searchLib.parseSearchQuery('https://example.com tag: author:member')
    ).toEqual({
      filters: { author: ['member'], log: [], tag: [] },
      text: 'https://example.com tag:',
    });
  });
});
