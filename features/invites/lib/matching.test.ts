import { Role } from '@/domain/teams/role';
import { findMemberInviteByLogs } from '@/features/invites/lib/matching';
import type { Log } from '@/features/logs/types/log';
import schema from '@/instant.schema';
import { InstaQLEntity } from '@instantdb/react-native';
import { describe, expect, test } from 'bun:test';

type Invite = InstaQLEntity<typeof schema, 'invites'>;

type TestInvite = Pick<Invite, 'id' | 'key' | 'role'> & {
  logs?: Pick<Log, 'id'>[] | null;
};

describe('findMemberInviteByLogs', () => {
  test('matches log sets', () => {
    const invites: TestInvite[] = [
      {
        id: 'admin-invite',
        key: 'admin-key',
        logs: [{ id: 'log-b' }, { id: 'log-a' }],
        role: 'admin',
      },
      {
        id: 'member-invite',
        key: 'member-key',
        logs: [{ id: 'log-b' }, { id: 'log-a' }],
        role: Role.Member,
      },
    ];

    expect(findMemberInviteByLogs(invites, ['log-a', 'log-b'])?.id).toBe(
      'member-invite'
    );

    expect(invites[1].logs?.map((log) => log.id)).toEqual(['log-b', 'log-a']);
  });

  test('requires exact logs', () => {
    const invites: TestInvite[] = [
      {
        id: 'missing-log',
        key: 'missing-key',
        logs: [{ id: 'log-a' }],
        role: Role.Member,
      },
      {
        id: 'extra-log',
        key: 'extra-key',
        logs: [{ id: 'log-a' }, { id: 'log-b' }, { id: 'log-c' }],
        role: Role.Member,
      },
    ];

    expect(findMemberInviteByLogs(invites, ['log-a', 'log-b'])).toBeUndefined();
  });

  test('handles empty logs', () => {
    const invites: TestInvite[] = [
      {
        id: 'empty-null',
        key: 'empty-null-key',
        logs: null,
        role: Role.Member,
      },
      { id: 'empty-missing', key: 'empty-missing-key', role: Role.Member },
    ];

    expect(findMemberInviteByLogs(invites, [])?.id).toBe('empty-null');
    expect(findMemberInviteByLogs(invites, ['log-a'])).toBeUndefined();
  });

  test('ignores keyless invites', () => {
    const invites: TestInvite[] = [
      { id: 'old-invite', logs: [{ id: 'log-a' }], role: Role.Member },
    ];

    expect(findMemberInviteByLogs(invites, ['log-a'])).toBeUndefined();
  });
});
