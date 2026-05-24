import * as cardDisplay from '@/features/cards/lib/card-display';
import { describe, expect, test } from 'bun:test';

const yesterdayIso = () => {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() - 1);
  return date.toISOString();
};

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

  test('formats labels', () => {
    expect(
      cardDisplay.formatCardDisplayLabel(
        'Last above-threshold session date for'
      )
    ).toBe('Last above-threshold session date');
  });

  test('formats since metrics', () => {
    expect(
      cardDisplay.formatMetricValue(
        {
          unit: 'days',
          value: '2026-02-23T12:00:00.000Z',
          valueFormat: 'durationSince',
        },
        new Date('2026-05-25T12:00:00.000Z')
      )
    ).toBe('91 days');

    expect(
      cardDisplay.formatMetricValue(
        {
          unit: 'weeks',
          value: '2026-02-23T12:00:00.000Z',
          valueFormat: 'durationSince',
        },
        new Date('2026-05-25T12:00:00.000Z')
      )
    ).toBe('13 weeks');

    expect(
      cardDisplay.formatMetricValue(
        {
          unit: 'months',
          value: '2026-02-23T12:00:00.000Z',
          valueFormat: 'durationSince',
        },
        new Date('2026-05-25T12:00:00.000Z')
      )
    ).toBe('3 months');

    expect(
      cardDisplay.formatMetricValue(
        {
          unit: 'years',
          value: '2024-02-23T12:00:00.000Z',
          valueFormat: 'durationSince',
        },
        new Date('2026-05-25T12:00:00.000Z')
      )
    ).toBe('2 years');
  });

  test('formats card text', () => {
    const formatted = cardDisplay.formatCardText(
      'Latest check-in was 2024-06-15T12:30:00.000Z.'
    );

    expect(formatted).toContain('Latest check-in was');
    expect(formatted).not.toContain('2024-06-15T12:30:00.000Z');
  });

  test('formats summary dates', () => {
    const sparse = cardDisplay.formatCardSummaryText(
      'Started 2024-06-15T12:30:00.000Z. Finished 2024-06-16T12:30:00.000Z.'
    );

    expect(sparse).toContain('Started June 15, 2024.');
    expect(sparse).toContain('Finished June 16, 2024.');
    expect(sparse).not.toContain(' at ');

    const dense = cardDisplay.formatCardSummaryText(
      'Started 2024-06-15T12:30:00.000Z. Finished 2024-06-15T14:00:00.000Z.'
    );

    expect(dense).toContain('Started Jun 15, 2024 at');
    expect(dense).toContain('Finished Jun 15, 2024 at');
  });

  test('formats summary relative dates', () => {
    const formatted = cardDisplay.formatCardSummaryText(
      `Reached a current longest streak of 2 weeks on ${yesterdayIso()}.`
    );

    expect(formatted).toBe(
      'Reached a current longest streak of 2 weeks yesterday.'
    );
  });

  test('detects displayable output', () => {
    expect(cardDisplay.hasDisplayableCardOutput(null)).toBe(false);

    expect(
      cardDisplay.hasDisplayableCardOutput({
        metrics: [],
        milestones: [],
        summary: 'No matching records yet',
      })
    ).toBe(false);

    expect(
      cardDisplay.hasDisplayableCardOutput({
        metrics: [],
        milestones: [],
        summary: 'Sleep improved this week.',
      })
    ).toBe(true);

    expect(
      cardDisplay.hasDisplayableCardOutput({
        metrics: [{ label: 'Sessions', value: 3 }],
        milestones: [],
      })
    ).toBe(true);
  });
});
