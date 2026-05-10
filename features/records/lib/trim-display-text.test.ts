import { describe, expect, test } from 'bun:test';
import * as displayText from '@/features/records/lib/trim-display-text';

const { getCollapsedPreviewNumberOfLines, trimDisplayText } = displayText;

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

describe('getCollapsedPreviewNumberOfLines', () => {
  test('keeps the requested line count when the cutoff line has content', () => {
    expect(
      getCollapsedPreviewNumberOfLines({ numberOfLines: 3, text: 'A\n\nB\nC' })
    ).toBe(3);
  });

  test('backs up when the collapsed cutoff lands on a blank line', () => {
    expect(
      getCollapsedPreviewNumberOfLines({ numberOfLines: 2, text: 'A\n\nB' })
    ).toBe(1);
  });

  test('backs up across multiple blank lines at the collapsed cutoff', () => {
    expect(
      getCollapsedPreviewNumberOfLines({
        numberOfLines: 4,
        text: 'A\n \n\t\n\nB',
      })
    ).toBe(1);
  });

  test('keeps trailing blank lines when the text fits without truncation', () => {
    expect(
      getCollapsedPreviewNumberOfLines({ numberOfLines: 4, text: 'A\n\nB' })
    ).toBe(4);
  });
});
