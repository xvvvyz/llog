import * as cardOutput from '@/domain/cards/output';
import type { CardOutput } from '@/domain/cards/output';
import { describe, expect, test } from 'bun:test';

const validOutput: CardOutput = {
  chart: {
    data: [
      { label: 'Jan', value: 1 },
      { label: 'Feb', value: 2 },
    ],
    type: 'line',
  },
  metrics: [{ label: 'Sessions', value: 4 }],
  milestones: [{ title: 'Started baseline' }],
  summary: 'Progress is steady.',
};

describe('card output', () => {
  test('accepts schema', () => {
    expect(cardOutput.validateCardOutput(validOutput).success).toBe(true);
  });

  test('accepts single sections', () => {
    expect(
      cardOutput.validateCardOutput({
        chart: { data: [{ label: 'Jan', value: 1 }], type: 'line' },
      }).success
    ).toBe(true);

    expect(
      cardOutput.validateCardOutput({
        metrics: [{ label: 'Best duration', unit: 'min', value: 5 }],
      }).success
    ).toBe(true);

    expect(
      cardOutput.validateCardOutput({
        milestones: [{ title: 'Started baseline' }],
      }).success
    ).toBe(true);
  });

  test('rejects empty output', () => {
    expect(cardOutput.validateCardOutput({}).success).toBe(false);
  });

  test('rejects invalid chart', () => {
    expect(
      cardOutput.validateCardOutput({
        ...validOutput,
        chart: { data: [{ label: 'Jan', value: 'many' }], type: 'pie' },
      }).success
    ).toBe(false);
  });

  test('rejects bar chart series', () => {
    expect(
      cardOutput.validateCardOutput({
        chart: {
          series: [{ data: [{ label: 'Jan', value: 1 }], label: 'One' }],
          type: 'bar',
        },
      }).success
    ).toBe(false);
  });

  test('normalizes raw llm output', () => {
    const normalized = cardOutput.normalizeRawCardOutput({
      chart: {
        data: [
          { extra: true, label: '2026-05-19', value: '4' },
          { label: '2026-05-20', value: 6 },
        ],
        ignored: true,
        title: 'Minutes alone over time',
        type: 'line',
        xAxis: { labelMode: 'all' },
        yAxis: { decimals: '0', tickCount: '6' },
      },
      metrics: [
        {
          extra: true,
          label: 'Longest duration',
          trend: 'up',
          unit: 'min.',
          value: '6',
        },
      ],
      milestones: [
        {
          date: '2026-05-20',
          detail: 'Calm at the door.',
          title: 'Door calm!',
        },
      ],
      summary: 'Progress is steady.',
    });

    expect(cardOutput.validateCardOutput(normalized).success).toBe(true);

    expect(normalized).toMatchObject({
      chart: {
        data: [
          { label: '2026-05-19', value: 4 },
          { label: '2026-05-20', value: 6 },
        ],
        xAxis: { labelMode: 'all' },
        yAxis: { decimals: 0, tickCount: 6 },
      },
      metrics: [{ label: 'Longest duration', unit: 'min' }],
      milestones: [{ title: 'Door calm' }],
    });
  });

  test('shortens raw summary', () => {
    const normalized = cardOutput.normalizeRawCardOutput({
      metrics: [{ label: 'Sessions', value: 2 }],
      summary: 'x'.repeat(cardOutput.MAX_CARD_GENERATED_SUMMARY_LENGTH + 20),
    });

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
        { label: 'Invalid date', value: '2026-05-20', valueFormat: 'date' },
      ],
    });

    expect(cardOutput.validateCardOutput(normalized).success).toBe(true);

    expect(normalized).toMatchObject({
      metrics: [{ valueFormat: 'date' }, { valueFormat: 'datetime' }],
    });

    expect((normalized as CardOutput).metrics).toHaveLength(2);
  });

  test('strips noisy metric trends', () => {
    const normalized = cardOutput.normalizeRawCardOutput({
      metrics: [
        { label: 'Latest duration', trend: 'up', unit: 'min', value: 85 },
        { label: 'Latest minutes', trend: 'up', unit: 'min', value: 85 },
        { label: 'Longest <=2', trend: 'up', unit: 'min', value: 85 },
        { label: 'Safe increases', trend: 'up', value: 12 },
        { label: 'Under threshold', trend: 'up', value: '38/47' },
        {
          label: 'First check-in',
          trend: 'up',
          value: '2026-05-20T03:00:00.000Z',
          valueFormat: 'date',
        },
      ],
    });

    expect(normalized).toMatchObject({
      metrics: [
        { label: 'Latest duration', trend: 'up', unit: 'min', value: 85 },
        { label: 'Latest minutes', trend: 'up', unit: 'min', value: 85 },
        { label: 'Longest <=2', unit: 'min', value: 85 },
        { label: 'Safe increases', value: 12 },
        { label: 'Under threshold', value: '38/47' },
        {
          label: 'First check-in',
          value: '2026-05-20T03:00:00.000Z',
          valueFormat: 'date',
        },
      ],
    });
  });

  test('rejects legacy field names', () => {
    const normalized = cardOutput.normalizeRawCardOutput({
      output: {
        source_record_ids: [{ id: 'record-1' }],
        summary_text: 'Progress is steady.',
      },
    });

    expect(cardOutput.validateCardOutput(normalized).success).toBe(false);
  });

  test('normalizes chart series', () => {
    const normalized = cardOutput.normalizeRawCardOutput({
      chart: {
        data: [{ label: '2026-05-20', value: 999 }],
        series: [
          {
            data: [
              { label: '2026-05-19', value: '20' },
              { label: '2026-05-20', value: 30 },
            ],
            label: 'Alone time',
            unit: 'min',
          },
          {
            data: [
              { label: '2026-05-19', value: '8' },
              { label: '2026-05-20', value: 4 },
            ],
            label: 'Peak distress',
            unit: 'score',
          },
        ],
        title: 'Duration and distress',
        type: 'line',
      },
      metrics: [],
      milestones: [],
      summary: 'Duration increased while distress dropped.',
    });

    expect(cardOutput.validateCardOutput(normalized).success).toBe(true);

    expect(normalized).toMatchObject({
      chart: {
        series: [
          { label: 'Alone time', unit: 'min' },
          { label: 'Peak distress', unit: 'score' },
        ],
      },
    });

    expect((normalized as CardOutput).chart).not.toHaveProperty('data');
  });

  test('sorts milestone dates', () => {
    const normalized = cardOutput.normalizeCardOutputMilestoneDates({
      ...validOutput,
      milestones: [
        { date: '2026-05-19T00:00:00.000Z', title: 'Started baseline' },
        { date: '2026-05-21T00:00:00.000Z', title: 'Calm short absence' },
      ],
    });

    expect(normalized.milestones.map((milestone) => milestone.date)).toEqual([
      '2026-05-21T00:00:00.000Z',
      '2026-05-19T00:00:00.000Z',
    ]);
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
    expect(cardOutput.normalizeCardDate('2026-02-31')).toBeUndefined();

    const normalized = cardOutput.normalizeCardOutputMilestoneDates({
      ...validOutput,
      milestones: [{ date: '2026-05-20', title: 'Door calm' }],
    });

    expect(normalized.milestones[0]?.date).toBeUndefined();
  });

  test('merges refresh output', () => {
    const merged = cardOutput.mergeCardOutputRefresh({
      next: {
        chart: {
          series: [
            {
              data: [
                { label: 'Jan', value: 2 },
                { label: 'Feb', value: 4 },
              ],
              label: 'Different label',
              unit: 'sec',
            },
          ],
          title: 'Changed chart',
          type: 'line',
        },
        metrics: [
          { label: 'Changed label', trend: 'up', unit: 'sec', value: 8 },
        ],
        milestones: [{ date: '2026-05-20', title: 'New best' }],
        summary: 'Updated summary.',
      },
      previous: {
        chart: {
          series: [
            {
              data: [{ label: 'Jan', value: 1 }],
              label: 'Alone time',
              unit: 'min',
            },
          ],
          title: 'Minutes alone',
          type: 'line',
          yAxis: { decimals: 0 },
        },
        metrics: [
          { label: 'Best duration', trend: 'up', unit: 'min', value: 5 },
        ],
        milestones: [{ date: '2026-05-01', title: 'Started baseline' }],
        summary: 'Original summary.',
      },
    });

    expect(merged).toMatchObject({
      chart: {
        series: [
          {
            data: [
              { label: 'Jan', value: 2 },
              { label: 'Feb', value: 4 },
            ],
            label: 'Alone time',
            unit: 'min',
          },
        ],
        title: 'Minutes alone',
        type: 'line',
        yAxis: { decimals: 0 },
      },
      metrics: [{ label: 'Best duration', unit: 'min', value: 8 }],
      milestones: [{ title: 'New best' }],
      summary: 'Updated summary.',
    });
  });

  test('uses refreshed milestones', () => {
    const merged = cardOutput.mergeCardOutputRefresh({
      next: {
        metrics: [],
        milestones: [
          {
            date: '2026-05-01T00:00:00.000Z',
            detail: 'Changed detail.',
            title: 'Baseline began',
          },
        ],
      },
      previous: {
        metrics: [],
        milestones: [
          {
            date: '2026-05-01T00:00:00.000Z',
            detail: 'Original detail.',
            title: 'Started baseline',
          },
        ],
      },
    });

    expect(merged.milestones).toEqual([
      {
        date: '2026-05-01T00:00:00.000Z',
        detail: 'Changed detail.',
        title: 'Baseline began',
      },
    ]);
  });

  test('drops refreshed summary', () => {
    const merged = cardOutput.mergeCardOutputRefresh({
      next: { metrics: [{ label: 'Sessions', value: 3 }], milestones: [] },
      previous: {
        metrics: [{ label: 'Sessions', value: 2 }],
        milestones: [],
        summary: 'Sessions increased from 2 to 3.',
      },
    });

    expect(merged).not.toHaveProperty('summary');
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

  test('matches refresh labels', () => {
    const merged = cardOutput.mergeCardOutputRefresh({
      next: {
        chart: {
          series: [
            { data: [{ label: 'Jan', value: 2 }], label: 'Distress' },
            { data: [{ label: 'Jan', value: 30 }], label: 'Duration' },
          ],
          type: 'line',
        },
        metrics: [
          { label: 'Latest distress', value: 2 },
          { label: 'Latest duration', value: 30 },
        ],
        milestones: [],
      },
      previous: {
        chart: {
          series: [
            {
              data: [{ label: 'Jan', value: 20 }],
              label: 'Duration',
              unit: 'min',
            },
            {
              data: [{ label: 'Jan', value: 4 }],
              label: 'Distress',
              unit: '0-5',
            },
          ],
          type: 'line',
        },
        metrics: [
          { label: 'Latest duration', unit: 'min', value: 20 },
          { label: 'Latest distress', unit: '0-5', value: 4 },
        ],
        milestones: [],
      },
    });

    expect(
      merged.chart?.series?.map((series) => series.data[0]?.value)
    ).toEqual([30, 2]);

    expect(merged.metrics).toEqual([
      { label: 'Latest duration', unit: 'min', value: 30 },
      { label: 'Latest distress', unit: '0-5', value: 2 },
    ]);
  });

  test('keeps summary fallback', () => {
    const merged = cardOutput.mergeCardOutputRefresh({
      next: { metrics: [{ label: 'Sessions', value: 3 }], milestones: [] },
      previous: { metrics: [], milestones: [], summary: 'Only summary.' },
    });

    expect(merged).toEqual({
      metrics: [],
      milestones: [],
      summary: 'Only summary.',
    });
  });
});
