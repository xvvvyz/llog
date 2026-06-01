import { getLogDeleteInviteIds } from '@/api/logs/log';
import { Role } from '@/domain/teams/role';
import { describe, expect, test } from 'bun:test';

describe('delete log invites', () => {
  test('removes empty member invites', () => {
    expect(
      getLogDeleteInviteIds('log-a', [
        { id: 'single-log', role: Role.Member, logs: [{ id: 'log-a' }] },
        {
          id: 'multi-log',
          role: Role.Member,
          logs: [{ id: 'log-a' }, { id: 'log-b' }],
        },
        { id: 'admin', role: Role.Admin, logs: [] },
      ])
    ).toEqual(['single-log']);
  });

  test('dedupes invite ids', () => {
    expect(
      getLogDeleteInviteIds('log-a', [
        { id: 'single-log', role: Role.Member, logs: [{ id: 'log-a' }] },
        { id: 'single-log', role: Role.Member, logs: [{ id: 'log-a' }] },
      ])
    ).toEqual(['single-log']);
  });

  test('ignores unrelated invites', () => {
    expect(
      getLogDeleteInviteIds('log-a', [
        { id: 'empty', role: Role.Member, logs: [] },
        { id: 'other-log', role: Role.Member, logs: [{ id: 'log-b' }] },
      ])
    ).toEqual([]);
  });
});
