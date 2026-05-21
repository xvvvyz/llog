import * as cardOutput from '@/domain/cards/output';
import * as sourceSelection from '@/domain/cards/source-selection';
import { describe, expect, test } from 'bun:test';

const records = [
  {
    date: '2026-02-01T16:00:00.000Z',
    id: 'session-1',
    isDraft: false,
    tags: [{ id: 'separation' }],
    text: 'Separation practice: 3 minutes alone, one bark, settled quickly.',
  },
  {
    date: '2026-02-03T16:00:00.000Z',
    id: 'session-2',
    isDraft: false,
    tags: [{ id: 'separation' }],
    text: '5 minutes alone. Calm at the door and took the chew.',
  },
  {
    date: '2026-02-04T16:00:00.000Z',
    id: 'walk',
    isDraft: false,
    tags: [{ id: 'exercise' }],
    text: 'Long walk before lunch.',
  },
];

describe('separation demo card', () => {
  test('selects tagged sessions', () => {
    expect(
      sourceSelection
        .selectCardSourceRecords({
          records: records.filter((record) =>
            record.tags.some((tag) => tag.id === 'separation')
          ),
          tagIds: ['separation'],
        })
        .map((record) => record.id)
    ).toEqual(['session-1', 'session-2']);
  });

  test('accepts fixture output', () => {
    expect(
      cardOutput.validateCardOutput({
        chart: {
          data: [
            { label: 'Feb 1', value: 3 },
            { label: 'Feb 3', value: 5 },
          ],
          title: 'Minutes alone',
          type: 'line',
          unit: 'min',
        },
        metrics: [
          { label: 'Sessions', value: 2 },
          { label: 'Best duration', unit: 'min', value: 5 },
        ],
        milestones: [
          {
            detail: 'Reached 5 minutes with calm door behavior.',
            recordIds: ['session-2'],
            title: 'Calm short absence',
          },
        ],
        sourceRecordIds: ['session-1', 'session-2'],
        summary: 'Short absences increased from 3 to 5 minutes.',
      }).success
    ).toBe(true);
  });
});
