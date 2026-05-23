import * as blueprint from '@/domain/cards/blueprint';
import { describe, expect, test } from 'bun:test';
import * as separationAnxietyFixture from '@/domain/cards/separation-anxiety-fixture';

describe('card blueprint', () => {
  test('creates spec', () => {
    expect(
      blueprint.createCardBlueprint(
        separationAnxietyFixture.separationAnxietyOutput()
      )
    ).toEqual({
      chart: {
        kind: 'series',
        series: [
          { label: 'Duration', unit: 'min' },
          { label: 'Distress', unit: '0-5' },
        ],
        title: 'Duration and distress',
        type: 'line',
        xAxis: { labelMode: 'sparse' },
        yAxis: { decimals: 0, tickCount: 5 },
      },
      metrics: [
        {
          label: 'Latest duration',
          trend: true,
          unit: 'min',
          value:
            separationAnxietyFixture.separationAnxietyExpected.latestDuration,
        },
        {
          label: 'Latest distress',
          trend: true,
          unit: '0-5',
          value:
            separationAnxietyFixture.separationAnxietyExpected.latestDistress,
        },
        {
          label: 'Under threshold',
          value:
            separationAnxietyFixture.separationAnxietyExpected.underThreshold,
        },
        {
          label: 'Safe increases',
          unit: 'sessions',
          value:
            separationAnxietyFixture.separationAnxietyExpected.safeIncreases,
        },
        {
          label: 'Regressions',
          unit: 'sessions',
          value:
            separationAnxietyFixture.separationAnxietyExpected.regressions
              .length,
        },
      ],
      milestones: true,
      summary: true,
    });
  });

  test('rejects empty specs', () => {
    expect(blueprint.validateCardBlueprint({}).success).toBe(false);

    expect(
      blueprint.validateCardBlueprint({ metrics: [], summary: false }).success
    ).toBe(false);
  });
});
