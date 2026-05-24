import * as cardOutput from '@/domain/cards/output';
import type { CardOutput } from '@/domain/cards/output';
import { describe, expect, test } from 'bun:test';
import * as separationAnxietyFixture from '@/domain/cards/separation-anxiety-fixture';

const validOutput = separationAnxietyFixture.separationAnxietyOutput();

const rawSeriesOutput = () => {
  const records = separationAnxietyFixture.separationAnxietyRecords.slice(-2);

  return {
    chart: {
      data: [{ label: 'ignored', value: 999 }],
      series: [
        {
          data: records.map((record) => ({
            label: record.date,
            value: String(separationAnxietyFixture.separationDuration(record)),
          })),
          label: 'Alone duration (min)',
          unit: 'min.',
        },
        {
          data: records.map((record) => ({
            label: record.date,
            value: String(separationAnxietyFixture.separationDistress(record)),
          })),
          label: 'Peak distress (0-5)',
          unit: 'score',
        },
      ],
      title: 'Duration and distress',
      type: 'line',
      xAxis: { labelMode: 'all' },
      yAxis: { decimals: '0', tickCount: '5' },
    },
    metrics: [
      {
        label: 'Latest duration',
        trend: 'up',
        unit: 'min.',
        value: String(
          separationAnxietyFixture.separationAnxietyExpected.latestDuration
        ),
      },
      {
        label: 'Under threshold',
        trend: 'up',
        value:
          separationAnxietyFixture.separationAnxietyExpected.underThreshold,
      },
    ],
    milestones: [
      {
        date: separationAnxietyFixture.separationAnxietyExpected
          .latestHighWaterMark,
        detail: 'Reached the current high-water mark.',
        title: 'Latest high-water mark!',
      },
    ],
    summary: 'x'.repeat(cardOutput.MAX_CARD_GENERATED_SUMMARY_LENGTH + 20),
  };
};

describe('card output', () => {
  test('validates content', () => {
    expect(cardOutput.validateCardOutput(validOutput).success).toBe(true);

    expect(
      cardOutput.validateCardOutput({
        metrics: [{ label: 'Latest duration', unit: 'min', value: 85 }],
      }).success
    ).toBe(true);

    expect(
      cardOutput.validateCardOutput({
        metrics: [{ label: 'Last above', value: 9, valueFormat: 'datetime' }],
      }).success
    ).toBe(false);

    expect(cardOutput.validateCardOutput({}).success).toBe(false);

    expect(
      cardOutput.validateCardOutput({
        chart: { data: [{ label: 'Jan', value: 'many' }], type: 'pie' },
      }).success
    ).toBe(false);

    expect(
      cardOutput.validateCardOutput({
        chart: {
          series: [{ data: [{ label: 'Jan', value: 1 }], label: 'One' }],
          type: 'bar',
        },
      }).success
    ).toBe(false);
  });

  test('normalizes raw output', () => {
    const normalized = cardOutput.normalizeRawCardOutput(rawSeriesOutput());
    expect(cardOutput.validateCardOutput(normalized).success).toBe(true);

    expect(normalized).toMatchObject({
      chart: {
        series: [
          { label: 'Alone duration min', unit: 'min' },
          { label: 'Peak distress 0-5', unit: 'score' },
        ],
        xAxis: { labelMode: 'all' },
        yAxis: { decimals: 0, tickCount: 5 },
      },
      metrics: [
        { label: 'Latest duration', trend: 'up', unit: 'min', value: 85 },
        { label: 'Under threshold', value: '38/47' },
      ],
      milestones: [{ title: 'Latest high-water mark' }],
    });

    expect((normalized as CardOutput).chart).not.toHaveProperty('data');

    expect((normalized as CardOutput).summary).toHaveLength(
      cardOutput.MAX_CARD_GENERATED_SUMMARY_LENGTH
    );
  });

  test('preserves label symbols', () => {
    const normalized = cardOutput.normalizeRawCardOutput({
      metrics: [{ label: 'Next milestone 60/90/120 min', value: '90 min' }],
    });

    expect(normalized).toMatchObject({
      metrics: [{ label: 'Next milestone 60/90/120 min' }],
    });
  });

  test('trims dangling labels', () => {
    const normalized = cardOutput.normalizeRawCardOutput({
      metrics: [
        {
          label: 'Last above-threshold session date for Peak distress ≥3',
          value: '2026-02-23T17:00:00.000Z',
          valueFormat: 'datetime',
        },
      ],
    });

    expect(normalized).toMatchObject({
      metrics: [{ label: 'Last above-threshold session date' }],
    });
  });

  test('normalizes metric dates', () => {
    const normalized = cardOutput.normalizeRawCardOutput({
      metrics: [
        {
          label: 'First calm entry',
          value: '2026-05-20T03:00:00.000Z',
          valueFormat: 'date',
        },
        {
          label: 'Last check-in',
          value: '2026-05-21T17:30:00.000Z',
          valueFormat: 'date_time',
        },
        {
          label: 'Days since last',
          unit: 'days',
          value: '2026-02-23T17:00:00.000Z',
          valueFormat: 'durationSince',
        },
        { label: 'Invalid date', value: '2026-05-20', valueFormat: 'date' },
        { label: 'Invalid since', value: 90, valueFormat: 'durationSince' },
      ],
    });

    expect(cardOutput.validateCardOutput(normalized).success).toBe(true);

    expect(normalized).toMatchObject({
      metrics: [
        { valueFormat: 'date' },
        { valueFormat: 'datetime' },
        { valueFormat: 'durationSince' },
      ],
    });

    expect((normalized as CardOutput).metrics).toHaveLength(3);
  });

  test('uses source dates', () => {
    expect(cardOutput.normalizeCardDate('2026-05-20')).toBeUndefined();

    expect(cardOutput.normalizeCardDate('2026-05-20T00:00:00.000Z')).toBe(
      '2026-05-20T00:00:00.000Z'
    );

    expect(cardOutput.normalizeCardDate('2026-05-20T00:00:00-07:00')).toBe(
      '2026-05-20T07:00:00.000Z'
    );

    expect(cardOutput.normalizeCardDate('2026-05-20T00:00:00')).toBeUndefined();

    expect(
      cardOutput.normalizeCardDate('2026-02-31T00:00:00.000Z')
    ).toBeUndefined();

    expect(cardOutput.normalizeCardDate('May 20, 2026')).toBeUndefined();
  });

  test('sorts milestones', () => {
    const normalized = cardOutput.normalizeCardOutputMilestoneDates({
      ...validOutput,
      milestones: [
        { date: '2026-01-13T17:00:00.000Z', title: 'First calm increase' },
        { date: '2026-03-10T17:00:00.000Z', title: 'Latest high water mark' },
      ],
    });

    expect(normalized.milestones.map((milestone) => milestone.date)).toEqual([
      '2026-03-10T17:00:00.000Z',
      '2026-01-13T17:00:00.000Z',
    ]);
  });

  test('merges refresh output', () => {
    const previous = separationAnxietyFixture.separationAnxietyOutput(
      separationAnxietyFixture.separationAnxietyRecords.slice(0, 10)
    );

    const next = separationAnxietyFixture.separationAnxietyOutput();

    if (!previous.chart?.series || !next.chart?.series) {
      throw new Error('Expected series output');
    }

    const merged = cardOutput.mergeCardOutputRefresh({
      next: {
        ...next,
        chart: {
          ...next.chart,
          series: [next.chart.series[1]!, next.chart.series[0]!],
        },
        metrics: [next.metrics[1]!, next.metrics[0]!, ...next.metrics.slice(2)],
      },
      previous,
    });

    expect(merged.chart?.series?.map((series) => series.label)).toEqual([
      'Duration',
      'Distress',
    ]);

    expect(
      merged.chart?.series?.map((series) => series.data.at(-1)?.value)
    ).toEqual([
      separationAnxietyFixture.separationAnxietyExpected.latestDuration,
      separationAnxietyFixture.separationAnxietyExpected.latestDistress,
    ]);

    expect(merged.metrics.slice(0, 2)).toEqual([
      {
        label: 'Latest duration',
        trend: 'up',
        unit: 'min',
        value:
          separationAnxietyFixture.separationAnxietyExpected.latestDuration,
      },
      {
        label: 'Latest distress',
        trend: 'down',
        unit: '0-5',
        value:
          separationAnxietyFixture.separationAnxietyExpected.latestDistress,
      },
    ]);
  });

  test('locks refresh sections', () => {
    const merged = cardOutput.mergeCardOutputRefresh({
      next: {
        chart: { data: [{ label: 'Jan', value: 1 }], type: 'bar' },
        metrics: [{ label: 'Other', value: 5 }],
        milestones: [{ title: 'Should not add section' }],
      },
      previous: { metrics: [{ label: 'Sessions', value: 1 }], milestones: [] },
    });

    expect(merged.chart).toBeUndefined();
    expect(merged.metrics).toEqual([{ label: 'Sessions', value: 5 }]);
    expect(merged.milestones).toEqual([]);
  });

  test('replaces exact metrics', () => {
    const merged = cardOutput.mergeCardOutputRefresh({
      next: {
        metrics: [
          { label: 'Total above threshold', unit: 'sessions', value: 9 },
          {
            label: 'Days since last',
            unit: 'days',
            value: '2026-02-23T17:00:00.000Z',
            valueFormat: 'durationSince',
          },
        ],
        milestones: [],
      },
      previous: {
        metrics: [
          { label: 'Since last >=3', unit: 'days', value: 0 },
          { label: 'Last >=3', value: '2026-02-23T17:00:00.000Z' },
        ],
        milestones: [],
      },
      replaceMetrics: true,
    });

    expect(merged.metrics).toEqual([
      { label: 'Total above threshold', unit: 'sessions', value: 9 },
      {
        label: 'Days since last',
        unit: 'days',
        value: '2026-02-23T17:00:00.000Z',
        valueFormat: 'durationSince',
      },
    ]);
  });
});
