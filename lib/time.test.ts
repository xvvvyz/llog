import { describe, expect, test } from 'bun:test';
import * as time from '@/lib/time';

describe('time', () => {
  test('parses iso datetimes', () => {
    expect(time.parseIsoDateTime('2024-06-15T12:30:00.000Z')).toBeInstanceOf(
      Date
    );

    expect(time.parseIsoDateTime('2024-06-15')).toBeUndefined();
    expect(time.parseIsoDateTime('2024-02-31T12:30:00.000Z')).toBeUndefined();
  });

  test('formats iso values', () => {
    expect(
      time.formatIsoDateTimeValue('2024-06-15T12:30:00.000Z', 'date')
    ).toBe('June 15, 2024');

    const formatted = time.formatIsoDateTimeValue(
      '2024-06-15T12:30:00.000Z',
      'datetime'
    );

    expect(formatted).toContain('Jun 15, 2024');
    expect(formatted).toContain('at');
  });

  test('formats iso text', () => {
    const formatted = time.formatIsoDateTimeInText(
      'First logged 2024-06-15T12:30:00.000Z.'
    );

    expect(formatted).toContain('First logged');
    expect(formatted).not.toContain('2024-06-15T12:30:00.000Z');
  });
});
