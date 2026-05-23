import * as cardOutput from '@/domain/cards/output';
import * as sourceSelection from '@/domain/cards/source-selection';
import { describe, expect, test } from 'bun:test';
import * as separationAnxietyFixture from '@/domain/cards/separation-anxiety-fixture';

describe('separation fixture', () => {
  test('loads sessions', () => {
    expect(separationAnxietyFixture.separationAnxietyRecords).toHaveLength(
      separationAnxietyFixture.separationAnxietyExpected.sessionCount
    );

    expect(separationAnxietyFixture.separationAnxietyRecords[0]).toMatchObject({
      tags: [{ id: 'session', name: 'Session' }],
    });
  });

  test('selects sessions', () => {
    expect(
      sourceSelection
        .selectCardSourceRecords({
          records: separationAnxietyFixture.separationAnxietyRecords,
          tagIds: separationAnxietyFixture.separationSessionTagIds,
        })
        .map((record) => record.id)
    ).toEqual(
      separationAnxietyFixture.separationAnxietyRecords.map(
        (record) => record.id
      )
    );
  });

  test('builds output', () => {
    const output = separationAnxietyFixture.separationAnxietyOutput();
    expect(cardOutput.validateCardOutput(output).success).toBe(true);

    expect(output.chart?.series?.map((series) => series.label)).toEqual([
      'Duration',
      'Distress',
    ]);

    expect(output.chart).not.toHaveProperty('data');

    expect(output.metrics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: 'Latest duration',
          value:
            separationAnxietyFixture.separationAnxietyExpected.latestDuration,
        }),
        expect.objectContaining({
          label: 'Latest distress',
          value:
            separationAnxietyFixture.separationAnxietyExpected.latestDistress,
        }),
        expect.objectContaining({
          label: 'Under threshold',
          value:
            separationAnxietyFixture.separationAnxietyExpected.underThreshold,
        }),
        expect.objectContaining({
          label: 'Safe increases',
          value:
            separationAnxietyFixture.separationAnxietyExpected.safeIncreases,
        }),
      ])
    );

    expect(output.chart?.series?.[0]?.data.at(-1)).toEqual({
      label:
        separationAnxietyFixture.separationAnxietyExpected.latestHighWaterMark,
      value: separationAnxietyFixture.separationDuration(
        separationAnxietyFixture.separationAnxietyRecords.at(-1)!
      ),
    });
  });
});
