import { describe, expect, test } from 'bun:test';
import * as recordTime from '@/features/records/lib/record-time';

describe('record time', () => {
  test('uses custom record date', () => {
    expect(
      recordTime.getRecordDate({
        createdAt: '2026-05-25T12:00:00.000Z',
        recordDate: '2026-05-24T20:30:00.000Z',
      })
    ).toBe('2026-05-24T20:30:00.000Z');
  });

  test('falls back to submit date', () => {
    expect(
      recordTime.getRecordDate({ createdAt: '2026-05-25T12:00:00.000Z' })
    ).toBe('2026-05-25T12:00:00.000Z');
  });

  test('parses manual input', () => {
    const parsed = recordTime.parseRecordDateTimeInput({
      dateText: '2026-05-24',
      timeText: '8:30 PM',
    });

    expect(parsed?.getFullYear()).toBe(2026);
    expect(parsed?.getMonth()).toBe(4);
    expect(parsed?.getDate()).toBe(24);
    expect(parsed?.getHours()).toBe(20);
    expect(parsed?.getMinutes()).toBe(30);
  });

  test('rejects invalid dates', () => {
    expect(
      recordTime.parseRecordDateTimeInput({
        dateText: '2026-02-31',
        timeText: '12:00',
      })
    ).toBeUndefined();
  });
});
