import * as durationUtils from '@/lib/duration';
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
    expect(durationUtils.durationMsToSeconds(0)).toBe(0);
    expect(durationUtils.durationMsToSeconds(1234)).toBe(1.234);
  });

  test('rejects invalid ms', () => {
    for (const duration of invalidDurations) {
      expect(durationUtils.durationMsToSeconds(duration)).toBeUndefined();
    }
  });
});

describe('durationSecondsToMs', () => {
  test('converts seconds to ms', () => {
    expect(durationUtils.durationSecondsToMs(0)).toBe(0);
    expect(durationUtils.durationSecondsToMs(1.2344)).toBe(1234);
    expect(durationUtils.durationSecondsToMs(1.2345)).toBe(1235);
  });

  test('rejects invalid seconds', () => {
    for (const duration of invalidDurations) {
      expect(durationUtils.durationSecondsToMs(duration)).toBeUndefined();
    }
  });
});

describe('positiveDurationSeconds', () => {
  test('keeps positive seconds', () => {
    expect(durationUtils.positiveDurationSeconds(0.001)).toBe(0.001);
    expect(durationUtils.positiveDurationSeconds(0)).toBeUndefined();

    for (const duration of invalidDurations) {
      expect(durationUtils.positiveDurationSeconds(duration)).toBeUndefined();
    }
  });
});
