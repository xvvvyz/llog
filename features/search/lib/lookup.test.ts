import { describe, expect, test } from 'bun:test';
import * as lookup from '@/features/search/lib/lookup';

describe('search lookup queries', () => {
  test('formats words', () => {
    expect(lookup.getLogSearchQuery({ name: 'foo' })).toBe('log:foo ');
    expect(lookup.getTagSearchQuery({ name: 'bar' })).toBe('tag:bar ');
  });

  test('quotes spaces', () => {
    expect(lookup.getLogSearchQuery({ name: 'foo bar' })).toBe(
      'log:"foo bar" '
    );
    expect(
      lookup.getRecordTagSearchQuery({
        log: { name: 'foo bar' },
        tag: { name: 'baz' },
      })
    ).toBe('log:"foo bar" tag:baz ');
  });
});
