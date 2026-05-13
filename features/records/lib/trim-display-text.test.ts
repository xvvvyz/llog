import { describe, expect, test } from 'bun:test';
import * as displayText from '@/features/records/lib/trim-display-text';

const { hasExplicitLineBreaks, trimDisplayText } = displayText;
const { getCollapsedPreview } = displayText;

describe('trimDisplayText', () => {
  test('trims whitespace', () => {
    expect(trimDisplayText('  Hello foold  ')).toBe('Hello foold');
  });

  test('collapses breaks', () => {
    expect(trimDisplayText('A\n\n\nB\r\r\rC\r\n\r\n\r\nD')).toBe(
      'A\n\nB\n\nC\n\nD'
    );
  });

  test('handles nullish text', () => {
    expect(trimDisplayText()).toBe('');
    expect(trimDisplayText(null)).toBe('');
  });
});

describe('hasExplicitLineBreaks', () => {
  test('detects newlines', () => {
    expect(hasExplicitLineBreaks('A\nB')).toBe(true);
    expect(hasExplicitLineBreaks('A\rB')).toBe(true);
    expect(hasExplicitLineBreaks('A\r\nB')).toBe(true);
  });

  test('ignores wrapped text', () => {
    expect(hasExplicitLineBreaks('Lorem ipsum dolor sit amet')).toBe(false);
  });
});

describe('getCollapsedPreview', () => {
  test('clamps wrapped text', () => {
    expect(getCollapsedPreview({ numberOfLines: 3, text: 'A' })).toEqual({
      isLineTruncated: false,
      numberOfLines: 3,
      text: 'A',
    });
  });

  test('keeps fitting text', () => {
    expect(getCollapsedPreview({ numberOfLines: 3, text: 'A\nB\nC' })).toEqual({
      isLineTruncated: false,
      numberOfLines: undefined,
      text: 'A\nB\nC',
    });
  });

  test('skips blank cutoff', () => {
    expect(
      getCollapsedPreview({ numberOfLines: 4, text: 'A\n \n\t\n\nB' })
    ).toEqual({ isLineTruncated: true, numberOfLines: undefined, text: 'A' });
  });

  test('trims complete lines', () => {
    expect(
      getCollapsedPreview({ numberOfLines: 3, text: 'A\nB\nC\nD' })
    ).toEqual({
      isLineTruncated: true,
      numberOfLines: undefined,
      text: 'A\nB\nC',
    });
  });
});
