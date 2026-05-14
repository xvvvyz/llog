import { describe, expect, test } from 'bun:test';
import * as lookup from '@/features/search/lib/lookup';

describe('lookup', () => {
  test('formats words', () => {
    expect(lookup.getLogSearchQuery({ name: 'inbox' })).toBe('log:inbox ');
    expect(lookup.getTagSearchQuery({ name: 'ideas' })).toBe('tag:ideas ');
  });

  test('quotes spaces', () => {
    expect(lookup.getLogSearchQuery({ name: 'daily notes' })).toBe(
      'log:"daily notes" '
    );

    expect(
      lookup.getRecordTagSearchQuery({
        log: { name: 'daily notes' },
        tag: { name: 'ideas' },
      })
    ).toBe('log:"daily notes" tag:ideas ');
  });
});
