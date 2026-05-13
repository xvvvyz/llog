import { readTextareaBlurText } from '@/features/records/lib/read-textarea-blur-text';
import { describe, expect, test } from 'bun:test';

describe('readTextareaBlurText', () => {
  test('prefers event values', () => {
    expect(
      readTextareaBlurText(
        {
          currentTarget: { value: 'current value' },
          nativeEvent: { text: 'native value' },
          target: { value: 'target value' },
        },
        'fallback'
      )
    ).toBe('current value');

    expect(
      readTextareaBlurText(
        {
          currentTarget: { value: 123 },
          nativeEvent: { text: 'native value' },
          target: { value: 'target value' },
        },
        'fallback'
      )
    ).toBe('target value');

    expect(
      readTextareaBlurText(
        {
          currentTarget: { value: 123 },
          nativeEvent: { text: 'native value' },
          target: { value: null },
        },
        'fallback'
      )
    ).toBe('native value');
  });

  test('uses fallback', () => {
    expect(readTextareaBlurText(null, 'fallback')).toBe('fallback');

    expect(
      readTextareaBlurText(
        {
          currentTarget: { value: 123 },
          nativeEvent: { text: undefined },
          target: { value: false },
        },
        'fallback'
      )
    ).toBe('fallback');
  });

  test('keeps empty strings', () => {
    expect(
      readTextareaBlurText({ currentTarget: { value: '' } }, 'fallback')
    ).toBe('');
  });
});
