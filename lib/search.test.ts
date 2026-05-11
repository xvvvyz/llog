import { createSearchIndex, normalizeSearchText } from '@/lib/search';
import { describe, expect, test } from 'bun:test';

describe('normalizeSearchText', () => {
  test('normalizes case, whitespace, and diacritics', () => {
    expect(normalizeSearchText('  MÉXICO  ')).toBe('mexico');
    expect(normalizeSearchText('Estás')).toBe('estas');
  });
});

describe('createSearchIndex', () => {
  test('matches accent-insensitive queries', () => {
    const index = createSearchIndex({
      documents: [{ id: '1', text: 'México y Estás' }],
      fields: ['text'],
      storeFields: ['text'],
    });

    expect(index.search('mexico')).toMatchObject([{ id: '1' }]);
    expect(index.search('estas')).toMatchObject([{ id: '1' }]);
  });
});
