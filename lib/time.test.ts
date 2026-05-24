import { describe, expect, test } from 'bun:test';
import * as time from '@/lib/time';

const yesterdayIso = () => {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() - 1);
  return date.toISOString();
};

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

  test('formats iso text by day', () => {
    const sparse = time.formatIsoDateTimeInTextByDay(
      'First 2024-06-15T12:30:00.000Z. Next 2024-06-16T12:30:00.000Z.'
    );

    expect(sparse).toContain('First June 15, 2024.');
    expect(sparse).toContain('Next June 16, 2024.');
    expect(sparse).not.toContain(' at ');

    const dense = time.formatIsoDateTimeInTextByDay(
      'First 2024-06-15T12:30:00.000Z. Next 2024-06-15T14:00:00.000Z.'
    );

    expect(dense).toContain('First Jun 15, 2024 at');
    expect(dense).toContain('Next Jun 15, 2024 at');
  });

  test('formats relative dates in text', () => {
    expect(
      time.formatIsoDateTimeInTextByDay(
        `Streak reached 2 weeks on ${yesterdayIso()}.`
      )
    ).toBe('Streak reached 2 weeks yesterday.');
  });
});
