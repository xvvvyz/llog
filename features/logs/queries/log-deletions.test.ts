import * as logDeletions from '@/features/logs/queries/log-deletions';
import { beforeEach, describe, expect, test } from 'bun:test';

beforeEach(() => {
  for (const log of logDeletions.getLocallyDeletedLogs()) {
    logDeletions.restoreLocallyDeletedLog(log.id);
  }
});

describe('log deletions', () => {
  test('tracks hidden logs', () => {
    logDeletions.hideLocallyDeletedLog({ id: 'log-a', teamId: 'team-a' });

    expect(logDeletions.getLocallyDeletedLogs()).toEqual([
      { id: 'log-a', teamId: 'team-a' },
    ]);

    logDeletions.restoreLocallyDeletedLog('log-a');
    expect(logDeletions.getLocallyDeletedLogs()).toEqual([]);
  });

  test('clears observed logs in team', () => {
    logDeletions.hideLocallyDeletedLog({ id: 'log-a', teamId: 'team-a' });
    logDeletions.hideLocallyDeletedLog({ id: 'log-b', teamId: 'team-b' });

    logDeletions.clearObservedLocallyDeletedLogs({
      logIds: new Set(),
      teamIds: new Set(['team-a']),
    });

    expect(logDeletions.getLocallyDeletedLogs()).toEqual([
      { id: 'log-b', teamId: 'team-b' },
    ]);
  });

  test('keeps logs still returned by the team query', () => {
    logDeletions.hideLocallyDeletedLog({ id: 'log-a', teamId: 'team-a' });

    logDeletions.clearObservedLocallyDeletedLogs({
      logIds: new Set(['log-a']),
      teamIds: new Set(['team-a']),
    });

    expect(logDeletions.getLocallyDeletedLogs()).toEqual([
      { id: 'log-a', teamId: 'team-a' },
    ]);
  });
});
