import * as blueprint from '@/domain/cards/blueprint';
import { describe, expect, test } from 'bun:test';

describe('card blueprint', () => {
  test('strips source data', () => {
    expect(
      blueprint.createCardBlueprint({
        chart: {
          data: [
            { label: 'Mon', value: 1 },
            { label: 'Tue', value: 2 },
          ],
          title: 'Weekly trend',
          type: 'line',
          unit: 'hrs',
          yAxis: { decimals: 1 },
        },
        metrics: [
          { label: 'Average sleep', trend: 'up', unit: 'hrs', value: 7.5 },
          {
            label: 'First entry',
            value: '2026-05-20T03:00:00.000Z',
            valueFormat: 'date',
          },
        ],
        milestones: [
          {
            date: '2026-05-20T00:00:00.000Z',
            detail: 'Slept through the night',
            recordIds: ['record-1'],
            title: 'Best night',
          },
        ],
        sourceRecordIds: ['record-1'],
        summary: 'Sleep improved this week.',
      })
    ).toEqual({
      chart: {
        kind: 'data',
        title: 'Weekly trend',
        type: 'line',
        unit: 'hrs',
        yAxis: { decimals: 1 },
      },
      metrics: [
        { label: 'Average sleep', trend: true, unit: 'hrs', value: 7.5 },
        {
          label: 'First entry',
          value: '2026-05-20T03:00:00.000Z',
          valueFormat: 'date',
        },
      ],
      milestones: true,
      summary: true,
    });
  });

  test('keeps series labels', () => {
    expect(
      blueprint.createCardBlueprint({
        chart: {
          series: [
            {
              data: [{ label: 'Week 1', value: 1 }],
              label: 'Morning',
              unit: 'min',
            },
            { data: [{ label: 'Week 1', value: 2 }], label: 'Evening' },
          ],
          type: 'line',
        },
        metrics: [],
        milestones: [],
        sourceRecordIds: [],
      })
    ).toEqual({
      chart: {
        kind: 'series',
        series: [{ label: 'Morning', unit: 'min' }, { label: 'Evening' }],
        type: 'line',
      },
    });
  });

  test('rejects empty specs', () => {
    expect(blueprint.validateCardBlueprint({}).success).toBe(false);

    expect(
      blueprint.validateCardBlueprint({ metrics: [], summary: false }).success
    ).toBe(false);
  });
});
