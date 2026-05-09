import { trimDisplayText } from '@/features/records/lib/trim-display-text';
import { describe, expect, test } from 'bun:test';

describe('trimDisplayText', () => {
  test('trims surrounding whitespace', () => {
    expect(trimDisplayText('  Hello world  ')).toBe('Hello world');
  });

  test('collapses three or more line breaks to a single blank line', () => {
    expect(trimDisplayText('A\n\n\nB\r\r\rC\r\n\r\n\r\nD')).toBe(
      'A\n\nB\n\nC\n\nD'
    );
  });

  test('converts nullish text to an empty string', () => {
    expect(trimDisplayText()).toBe('');
    expect(trimDisplayText(null)).toBe('');
  });
});
