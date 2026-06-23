import * as recordDeletions from '@/features/records/queries/record-deletions';
import { beforeEach, describe, expect, test } from 'bun:test';

beforeEach(() => {
  for (const record of recordDeletions.getLocallyDeletedRecords()) {
    recordDeletions.restoreLocallyDeletedRecord(record.id);
  }
});

describe('record deletions', () => {
  test('tracks hidden records', () => {
    recordDeletions.hideLocallyDeletedRecord({
      id: 'record-a',
      logId: 'log-a',
    });

    expect(recordDeletions.getLocallyDeletedRecords()).toEqual([
      { id: 'record-a', logId: 'log-a' },
    ]);

    recordDeletions.restoreLocallyDeletedRecord('record-a');
    expect(recordDeletions.getLocallyDeletedRecords()).toEqual([]);
  });

  test('clears observed records', () => {
    recordDeletions.hideLocallyDeletedRecord({
      id: 'record-a',
      logId: 'log-a',
    });

    recordDeletions.hideLocallyDeletedRecord({
      id: 'record-b',
      logId: 'log-b',
    });

    recordDeletions.clearObservedLocallyDeletedRecords({
      logId: 'log-a',
      recordIds: new Set(),
    });

    expect(recordDeletions.getLocallyDeletedRecords()).toEqual([
      { id: 'record-b', logId: 'log-b' },
    ]);
  });
});
