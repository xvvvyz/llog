import * as metricDisplay from '@/features/cards/lib/metric-display';
import { describe, expect, test } from 'bun:test';

describe('metric display', () => {
  test('formats values', () => {
    expect(metricDisplay.formatMetricValue({ unit: 'hrs', value: 7 })).toBe(
      '7 hrs'
    );

    expect(
      metricDisplay.formatMetricValue({
        label: 'Peak distress 0-5',
        unit: 'score',
        value: 2,
      })
    ).toBe('2/5');

    expect(metricDisplay.formatMetricValue({ unit: 'score', value: 2 })).toBe(
      '2'
    );

    expect(
      metricDisplay.formatMetricValue({ unit: 'percent', value: 38 })
    ).toBe('38%');

    expect(metricDisplay.formatMetricValue({ value: 'Improving' })).toBe(
      'Improving'
    );
  });

  test('formats dates', () => {
    expect(
      metricDisplay.formatMetricValue({
        value: '2024-06-15T12:30:00.000Z',
        valueFormat: 'date',
      })
    ).toBe('June 15, 2024');

    expect(
      metricDisplay.formatMetricValue({
        value: '2024-06-15T12:30:00.000Z',
        valueFormat: 'datetime',
      })
    ).toContain('Jun 15, 2024');
  });

  test('formats labels', () => {
    expect(
      metricDisplay.formatMetricLabel({
        label: 'Alone duration min',
        unit: 'min',
        value: 85,
      })
    ).toBe('Alone duration');

    expect(
      metricDisplay.formatMetricLabel({
        label: 'Alone duration minutes',
        unit: 'min',
        value: 85,
      })
    ).toBe('Alone duration');

    expect(
      metricDisplay.formatMetricLabel({
        label: 'Current distress <=2 streak',
        unit: 'sessions',
        value: 11,
      })
    ).toBe('Current distress ≤2 streak');

    expect(
      metricDisplay.formatMetricLabel({
        label: 'sessions',
        unit: 'sessions',
        value: 11,
      })
    ).toBe('Value');

    expect(
      metricDisplay.formatMetricLabel({
        label: 'Peak distress 0-5',
        unit: 'score',
        value: 2,
      })
    ).toBe('Peak distress');

    expect(
      metricDisplay.formatMetricLabel({
        label: 'Peak distress score 0-5',
        unit: 'score',
        value: 2,
      })
    ).toBe('Peak distress');

    expect(
      metricDisplay.formatMetricLabel({
        label: 'Latest duration days',
        unit: 'days',
        value: '2026-02-23T12:00:00.000Z',
        valueFormat: 'date',
      })
    ).toBe('Latest duration days');
  });

  test('formats display', () => {
    expect(
      metricDisplay.formatMetricDisplay({
        label: 'Alone duration min',
        unit: 'min',
        value: 85,
      })
    ).toEqual({ label: 'Alone duration', value: '85 min' });

    expect(
      metricDisplay.formatMetricDisplay({
        label: 'Peak distress 0-5',
        unit: 'score',
        value: 2,
      })
    ).toEqual({ label: 'Peak distress', value: '2/5' });

    expect(
      metricDisplay.formatMetricDisplay({
        label: 'Current distress <=2 streak',
        unit: 'sessions',
        value: 11,
      })
    ).toEqual({ label: 'Current distress ≤2 streak', value: '11 sessions' });
  });

  test('formats since', () => {
    expect(
      metricDisplay.formatMetricValue(
        {
          unit: 'days',
          value: '2026-02-23T12:00:00.000Z',
          valueFormat: 'durationSince',
        },
        new Date('2026-05-25T12:00:00.000Z')
      )
    ).toBe('91 days');

    expect(
      metricDisplay.formatMetricValue(
        {
          unit: 'weeks',
          value: '2026-02-23T12:00:00.000Z',
          valueFormat: 'durationSince',
        },
        new Date('2026-05-25T12:00:00.000Z')
      )
    ).toBe('13 weeks');

    expect(
      metricDisplay.formatMetricValue(
        {
          unit: 'months',
          value: '2026-02-23T12:00:00.000Z',
          valueFormat: 'durationSince',
        },
        new Date('2026-05-25T12:00:00.000Z')
      )
    ).toBe('3 months');

    expect(
      metricDisplay.formatMetricValue(
        {
          unit: 'years',
          value: '2024-02-23T12:00:00.000Z',
          valueFormat: 'durationSince',
        },
        new Date('2026-05-25T12:00:00.000Z')
      )
    ).toBe('2 years');
  });
});
