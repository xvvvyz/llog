import * as cardDisplay from '@/features/cards/lib/card-display';
import { describe, expect, test } from 'bun:test';

describe('card display', () => {
  test('formats metrics', () => {
    expect(cardDisplay.formatMetricValue({ unit: 'hrs', value: 7 })).toBe(
      '7 hrs'
    );

    expect(cardDisplay.formatMetricValue({ value: 'Improving' })).toBe(
      'Improving'
    );
  });

  test('formats date metrics', () => {
    expect(
      cardDisplay.formatMetricValue({
        value: '2024-06-15T12:30:00.000Z',
        valueFormat: 'date',
      })
    ).toBe('June 15, 2024');

    expect(
      cardDisplay.formatMetricValue({
        value: '2024-06-15T12:30:00.000Z',
        valueFormat: 'datetime',
      })
    ).toContain('Jun 15, 2024');
  });

  test('formats card text', () => {
    const formatted = cardDisplay.formatCardText(
      'Latest check-in was 2024-06-15T12:30:00.000Z.'
    );

    expect(formatted).toContain('Latest check-in was');
    expect(formatted).not.toContain('2024-06-15T12:30:00.000Z');
  });
});
