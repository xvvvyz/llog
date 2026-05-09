import * as duration2 from '@/lib/duration';
import { describe, expect, test } from 'bun:test';

const invalidDurations = [
  undefined,
  null,
  -1,
  Number.NaN,
  Number.POSITIVE_INFINITY,
] as const;

describe('durationMsToSeconds', () => {
  test('converts finite non-negative milliseconds to seconds', () => {
    expect(duration2.durationMsToSeconds(0)).toBe(0);
    expect(duration2.durationMsToSeconds(1234)).toBe(1.234);
  });

  test('rejects missing, negative, and non-finite millisecond values', () => {
    for (const duration of invalidDurations) {
      expect(duration2.durationMsToSeconds(duration)).toBeUndefined();
    }
  });
});

describe('durationSecondsToMs', () => {
  test('converts finite non-negative seconds to rounded milliseconds', () => {
    expect(duration2.durationSecondsToMs(0)).toBe(0);
    expect(duration2.durationSecondsToMs(1.2344)).toBe(1234);
    expect(duration2.durationSecondsToMs(1.2345)).toBe(1235);
  });

  test('rejects missing, negative, and non-finite second values', () => {
    for (const duration of invalidDurations) {
      expect(duration2.durationSecondsToMs(duration)).toBeUndefined();
    }
  });
});

describe('positiveDurationSeconds', () => {
  test('keeps only finite second values greater than zero', () => {
    expect(duration2.positiveDurationSeconds(0.001)).toBe(0.001);
    expect(duration2.positiveDurationSeconds(0)).toBeUndefined();

    for (const duration of invalidDurations) {
      expect(duration2.positiveDurationSeconds(duration)).toBeUndefined();
    }
  });
});
