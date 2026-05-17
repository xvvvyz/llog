import { Role } from '@/domain/teams/role';
import { describe, expect, mock, test } from 'bun:test';

mock.module('@/lib/db', () => ({
  db: { queryOnce: async () => ({ data: { invites: [] } }), tx: {} },
}));

const inviteLink = await import('@/features/invites/lib/invite-link');

type Transaction = {
  entity: string;
  id: string;
  links?: unknown;
  params?: unknown;
  update?: unknown;
};

const createTransaction = ({
  entity,
  id,
  params,
  update,
}: Omit<Transaction, 'links'>) => {
  const transaction: Transaction = { entity, id, params, update };

  Object.defineProperty(transaction, 'link', {
    value: (links: unknown) => ({ ...transaction, links }),
  });

  return transaction as Transaction & { link: (links: unknown) => Transaction };
};

const createTxNamespace = (entity: string) =>
  new Proxy(
    {},
    {
      get(_target, id: string | symbol) {
        if (typeof id !== 'string') return undefined;

        const build = (params?: unknown) => ({
          link: (links: unknown) =>
            createTransaction({ entity, id, params }).link(links),
          ruleParams: (nextParams: unknown) => build(nextParams),
          update: (update: unknown) =>
            createTransaction({ entity, id, params, update }),
        });

        return build();
      },
    }
  );

const createDb = () =>
  ({
    tx: { logs: createTxNamespace('logs'), roles: createTxNamespace('roles') },
  }) as Parameters<
    typeof inviteLink.buildRedeemInviteLinkTransactions
  >[0]['db'];

describe('invite links', () => {
  test('normalizes logs', () => {
    expect(
      inviteLink.normalizeInviteLogIds([' log-a ', '', 'log-b', 'log-a'])
    ).toEqual(['log-a', 'log-b']);
  });

  test('builds invite keys', () => {
    expect(
      inviteLink.getInviteKey({
        role: Role.Member,
        teamId: 'team-1',
        token: 'token-1',
      })
    ).toBe('token-1_member_team-1');
  });

  test('builds preview info', () => {
    const info = inviteLink.buildInviteLinkInfo({
      id: 'invite-1',
      key: 'token-1_member_team-1',
      role: Role.Member,
      team: {
        id: 'team-1',
        name: 'Team',
        roles: [
          {
            role: Role.Admin,
            user: {
              profile: {
                avatarSeedId: 'admin-seed',
                id: 'admin-profile',
                image: { uri: 'admin-image' },
                name: 'Admin',
              },
            },
          },
        ],
      },
      logs: [
        {
          id: 'log-1',
          name: 'Log',
          profiles: [
            { id: 'member-profile', name: 'Member' },
            { id: 'admin-profile', name: 'Admin duplicate' },
          ],
        },
      ],
    });

    expect(info).toEqual({
      isValid: true,
      logNames: ['Log'],
      members: [
        {
          avatarSeedId: undefined,
          id: 'admin-profile',
          image: undefined,
          name: 'Admin duplicate',
        },
        {
          avatarSeedId: undefined,
          id: 'member-profile',
          image: undefined,
          name: 'Member',
        },
      ],
      role: Role.Member,
      teamId: 'team-1',
      teamName: 'Team',
    });
  });

  test('rejects keyless previews', () => {
    expect(
      inviteLink.buildInviteLinkInfo({
        id: 'invite-1',
        role: Role.Member,
        team: { id: 'team-1' },
      })
    ).toEqual({ isValid: false });
  });

  test('builds member redemption', () => {
    const result = inviteLink.buildRedeemInviteLinkTransactions({
      db: createDb(),
      invite: {
        role: Role.Member,
        team: { id: 'team-1' },
        logs: [{ id: 'log-1' }, { id: 'log-2' }],
      },
      profileId: 'profile-1',
      roleId: 'role-1',
      token: 'token-1',
      userId: 'user-1',
    });

    expect(result as unknown).toEqual({
      logIds: ['log-1', 'log-2'],
      role: Role.Member,
      status: 'joined',
      teamId: 'team-1',
      transactions: [
        {
          entity: 'roles',
          id: 'role-1',
          links: { team: 'team-1', user: 'user-1' },
          params: { inviteToken: 'token-1' },
          update: {
            key: 'member_user-1_team-1',
            role: Role.Member,
            teamId: 'team-1',
            userId: 'user-1',
          },
        },
        {
          entity: 'logs',
          id: 'log-1',
          links: { profiles: 'profile-1' },
          params: { inviteToken: 'token-1' },
          update: undefined,
        },
        {
          entity: 'logs',
          id: 'log-2',
          links: { profiles: 'profile-1' },
          params: { inviteToken: 'token-1' },
          update: undefined,
        },
      ],
    });
  });

  test('builds admin upgrade', () => {
    const result = inviteLink.buildRedeemInviteLinkTransactions({
      db: createDb(),
      existingRole: { id: 'role-1', role: Role.Member },
      invite: { role: Role.Admin, team: { id: 'team-1' } },
      profileId: 'profile-1',
      roleId: 'unused-role',
      token: 'token-1',
      userId: 'user-1',
    });

    expect(result as unknown).toEqual({
      logIds: [],
      role: Role.Admin,
      status: 'role_updated',
      teamId: 'team-1',
      transactions: [
        {
          entity: 'roles',
          id: 'role-1',
          params: { inviteToken: 'token-1' },
          update: {
            key: 'admin_user-1_team-1',
            role: Role.Admin,
            teamId: 'team-1',
            userId: 'user-1',
          },
        },
      ],
    });
  });

  test('defers managed log links', () => {
    const result = inviteLink.buildRedeemInviteLinkTransactions({
      db: createDb(),
      existingRole: { id: 'role-1', role: Role.Admin },
      invite: {
        role: Role.Member,
        team: { id: 'team-1' },
        logs: [{ id: 'log-1' }],
      },
      profileId: 'profile-1',
      roleId: 'unused-role',
      token: 'token-1',
      userId: 'user-1',
    });

    expect(result as unknown).toEqual({
      logIds: ['log-1'],
      role: Role.Admin,
      status: 'logs_added',
      teamId: 'team-1',
      transactions: [],
    });
  });
});
