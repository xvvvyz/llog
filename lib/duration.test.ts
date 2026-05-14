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
  test('converts ms to seconds', () => {
    expect(duration2.durationMsToSeconds(0)).toBe(0);
    expect(duration2.durationMsToSeconds(1234)).toBe(1.234);
  });

  test('rejects invalid ms', () => {
    for (const duration of invalidDurations) {
      expect(duration2.durationMsToSeconds(duration)).toBeUndefined();
    }
  });
});

describe('durationSecondsToMs', () => {
  test('converts seconds to ms', () => {
    expect(duration2.durationSecondsToMs(0)).toBe(0);
    expect(duration2.durationSecondsToMs(1.2344)).toBe(1234);
    expect(duration2.durationSecondsToMs(1.2345)).toBe(1235);
  });

  test('rejects invalid seconds', () => {
    for (const duration of invalidDurations) {
      expect(duration2.durationSecondsToMs(duration)).toBeUndefined();
    }
  });
});

describe('positiveDurationSeconds', () => {
  test('keeps positive seconds', () => {
    expect(duration2.positiveDurationSeconds(0.001)).toBe(0.001);
    expect(duration2.positiveDurationSeconds(0)).toBeUndefined();

    for (const duration of invalidDurations) {
      expect(duration2.positiveDurationSeconds(duration)).toBeUndefined();
    }
  });
});
