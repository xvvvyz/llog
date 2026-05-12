import { Role } from '@/domain/teams/role';
import { findMemberInviteByLogs } from '@/features/invites/lib/matching';
import type { Log } from '@/features/logs/types/log';
import schema from '@/instant.schema';
import { InstaQLEntity } from '@instantdb/react-native';
import { describe, expect, it } from 'bun:test';

type Invite = InstaQLEntity<typeof schema, 'invites'>;

type TestInvite = Pick<Invite, 'id' | 'role'> & {
  logs?: Pick<Log, 'id'>[] | null;
};

describe('findMemberInviteByLogs', () => {
  it('finds a member invite with the same log ids regardless of order', () => {
    const invites: TestInvite[] = [
      {
        id: 'admin-invite',
        logs: [{ id: 'log-b' }, { id: 'log-a' }],
        role: 'admin',
      },
      {
        id: 'member-invite',
        logs: [{ id: 'log-b' }, { id: 'log-a' }],
        role: Role.Member,
      },
    ];

    expect(findMemberInviteByLogs(invites, ['log-a', 'log-b'])?.id).toBe(
      'member-invite'
    );

    expect(invites[1].logs?.map((log) => log.id)).toEqual(['log-b', 'log-a']);
  });

  it('requires the invite logs to match the requested logs exactly', () => {
    const invites: TestInvite[] = [
      { id: 'missing-log', logs: [{ id: 'log-a' }], role: Role.Member },
      {
        id: 'extra-log',
        logs: [{ id: 'log-a' }, { id: 'log-b' }, { id: 'log-c' }],
        role: Role.Member,
      },
    ];

    expect(findMemberInviteByLogs(invites, ['log-a', 'log-b'])).toBeUndefined();
  });

  it('treats null or missing invite logs as an empty log selection', () => {
    const invites: TestInvite[] = [
      { id: 'empty-null', logs: null, role: Role.Member },
      { id: 'empty-missing', role: Role.Member },
    ];

    expect(findMemberInviteByLogs(invites, [])?.id).toBe('empty-null');
    expect(findMemberInviteByLogs(invites, ['log-a'])).toBeUndefined();
  });
});
