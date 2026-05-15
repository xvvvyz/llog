import { formatCompactDuration, formatTime } from '@/lib/format-time';
import { describe, expect, test } from 'bun:test';

describe('formatTime', () => {
  test('formats elapsed time', () => {
    expect(formatTime(0)).toBe('0:00');
    expect(formatTime(5)).toBe('0:05');
    expect(formatTime(65)).toBe('1:05');
    expect(formatTime(3661.9)).toBe('61:01');
  });

  test('floors seconds', () => {
    expect(formatTime(59.9)).toBe('0:59');
  });

  test('handles invalid time', () => {
    expect(formatTime(-3)).toBe('0:00');
    expect(formatTime(Number.NaN)).toBe('0:00');
    expect(formatTime(Number.POSITIVE_INFINITY)).toBe('0:00');
  });
});

describe('formatCompactDuration', () => {
  test('formats seconds', () => {
    expect(formatCompactDuration(5)).toBe('5s');
    expect(formatCompactDuration(37.2)).toBe('37s');
  });

  test('formats minutes', () => {
    expect(formatCompactDuration(60)).toBe('1m');
    expect(formatCompactDuration(72)).toBe('1m 12s');
  });

  test('handles invalid time', () => {
    expect(formatCompactDuration(0.1)).toBeNull();
    expect(formatCompactDuration(0)).toBeNull();
    expect(formatCompactDuration(-3)).toBeNull();
    expect(formatCompactDuration(Number.NaN)).toBeNull();
  });
});
