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
  metrics: [{ featured: true, label: 'Sessions', value: 4 }],
  milestones: [{ recordIds: ['record-1'], title: 'Started baseline' }],
  sourceRecordIds: ['record-1'],
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
        metrics: [
          { featured: true, label: 'Best duration', unit: 'min', value: 5 },
        ],
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

  test('filters source ids', () => {
    expect(
      cardOutput.normalizeCardOutputSourceIds(
        {
          ...validOutput,
          milestones: [
            { recordIds: ['record-1', 'record-2'], title: 'Started baseline' },
          ],
          sourceRecordIds: ['record-1', 'record-2'],
        },
        ['record-1']
      )
    ).toMatchObject({
      milestones: [{ recordIds: ['record-1'] }],
      sourceRecordIds: ['record-1'],
    });
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
          featured: true,
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
          recordIds: ['record-1'],
          title: 'Door calm!',
        },
      ],
      sourceRecordIds: ['record-1'],
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
      metrics: [{ featured: true, trend: 'up', unit: 'min' }],
      milestones: [{ title: 'Door calm' }],
      sourceRecordIds: ['record-1'],
    });
  });

  test('preserves label symbols', () => {
    const normalized = cardOutput.normalizeRawCardOutput({
      metrics: [
        {
          featured: true,
          label: 'Next milestone 60/90/120 min',
          value: '90 min',
        },
      ],
    });

    expect(normalized).toMatchObject({
      metrics: [{ label: 'Next milestone 60/90/120 min' }],
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
      sourceRecordIds: ['record-1'],
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

  test('fills milestone dates', () => {
    const normalized = cardOutput.normalizeCardOutputMilestoneDates(
      {
        ...validOutput,
        milestones: [
          { recordIds: ['record-2'], title: 'Calm short absence' },
          {
            date: '2026-05-19T00:00:00.000Z',
            recordIds: ['record-1'],
            title: 'Started baseline',
          },
        ],
      },
      [
        { date: '2026-05-19T00:00:00.000Z', id: 'record-1' },
        { date: '2026-05-21T00:00:00.000Z', id: 'record-2' },
      ]
    );

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

    expect(cardOutput.normalizeCardDate('2026-02-31')).toBeUndefined();

    const normalized = cardOutput.normalizeCardOutputMilestoneDates(
      {
        ...validOutput,
        milestones: [
          { date: '2026-05-20', recordIds: ['record-1'], title: 'Door calm' },
        ],
      },
      [{ date: '2026-05-20T03:00:00.000Z', id: 'record-1' }]
    );

    expect(normalized.milestones[0]?.date).toBe('2026-05-20T03:00:00.000Z');
  });

  test('requires featured metrics', () => {
    expect(
      cardOutput.validateCardOutput({
        metrics: [{ featured: false, label: 'Sessions', value: 4 }],
      }).success
    ).toBe(false);

    expect(
      cardOutput.validateCardOutput({
        metrics: [
          { featured: true, label: 'One', value: 1 },
          { featured: true, label: 'Two', value: 2 },
          { featured: true, label: 'Three', value: 3 },
          { featured: true, label: 'Four', value: 4 },
          { featured: true, label: 'Five', value: 5 },
        ],
      }).success
    ).toBe(false);
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
          {
            featured: false,
            label: 'Changed label',
            trend: 'up',
            unit: 'sec',
            value: 8,
          },
        ],
        milestones: [{ date: '2026-05-20', title: 'New best' }],
        sourceRecordIds: ['record-2'],
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
          { featured: true, label: 'Best duration', unit: 'min', value: 5 },
        ],
        milestones: [{ date: '2026-05-01', title: 'Started baseline' }],
        sourceRecordIds: ['record-1'],
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
      metrics: [
        {
          featured: true,
          label: 'Best duration',
          trend: 'up',
          unit: 'min',
          value: 8,
        },
      ],
      milestones: [{ title: 'Started baseline' }, { title: 'New best' }],
      sourceRecordIds: ['record-2', 'record-1'],
      summary: 'Updated summary.',
    });
  });

  test('locks refresh sections', () => {
    const merged = cardOutput.mergeCardOutputRefresh({
      next: {
        chart: { data: [{ label: 'Jan', value: 1 }], type: 'bar' },
        metrics: [{ featured: true, label: 'Other', value: 5 }],
        milestones: [{ title: 'Should not add section' }],
        sourceRecordIds: [],
      },
      previous: {
        metrics: [{ featured: true, label: 'Sessions', value: 1 }],
        milestones: [],
        sourceRecordIds: [],
      },
    });

    expect(merged.chart).toBeUndefined();

    expect(merged.metrics).toEqual([
      { featured: true, label: 'Sessions', value: 5 },
    ]);

    expect(merged.milestones).toEqual([]);
  });
});
