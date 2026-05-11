import { describe, expect, test } from 'bun:test';
import * as displayText from '@/features/records/lib/trim-display-text';

const { hasExplicitLineBreaks, trimDisplayText } = displayText;
const { getCollapsedPreview } = displayText;

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

describe('hasExplicitLineBreaks', () => {
  test('detects newline styles', () => {
    expect(hasExplicitLineBreaks('A\nB')).toBe(true);
    expect(hasExplicitLineBreaks('A\rB')).toBe(true);
    expect(hasExplicitLineBreaks('A\r\nB')).toBe(true);
  });

  test('ignores wrapping-only text', () => {
    expect(hasExplicitLineBreaks('A long line that may wrap visually')).toBe(
      false
    );
  });
});

describe('getCollapsedPreview', () => {
  test('uses numberOfLines for single-line text that may wrap visually', () => {
    expect(getCollapsedPreview({ numberOfLines: 3, text: 'A' })).toEqual({
      isLineTruncated: false,
      numberOfLines: 3,
      text: 'A',
    });
  });

  test('does not clamp multiline text that already fits', () => {
    expect(getCollapsedPreview({ numberOfLines: 3, text: 'A\nB\nC' })).toEqual({
      isLineTruncated: false,
      numberOfLines: undefined,
      text: 'A\nB\nC',
    });
  });

  test('backs up when the collapsed cutoff lands on blank lines', () => {
    expect(
      getCollapsedPreview({ numberOfLines: 4, text: 'A\n \n\t\n\nB' })
    ).toEqual({ isLineTruncated: true, numberOfLines: undefined, text: 'A' });
  });

  test('trims multiline previews by complete source lines', () => {
    expect(
      getCollapsedPreview({ numberOfLines: 3, text: 'A\nB\nC\nD' })
    ).toEqual({
      isLineTruncated: true,
      numberOfLines: undefined,
      text: 'A\nB\nC',
    });
  });
});
