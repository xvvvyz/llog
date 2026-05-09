import { formatTime } from '@/lib/format-time';
import { describe, expect, test } from 'bun:test';

describe('formatTime', () => {
  test('formats elapsed seconds as minutes and zero-padded seconds', () => {
    expect(formatTime(0)).toBe('0:00');
    expect(formatTime(5)).toBe('0:05');
    expect(formatTime(65)).toBe('1:05');
    expect(formatTime(3661.9)).toBe('61:01');
  });

  test('floors fractional seconds instead of rounding up', () => {
    expect(formatTime(59.9)).toBe('0:59');
  });

  test('formats negative and non-finite seconds as zero', () => {
    expect(formatTime(-3)).toBe('0:00');
    expect(formatTime(Number.NaN)).toBe('0:00');
    expect(formatTime(Number.POSITIVE_INFINITY)).toBe('0:00');
  });
});
