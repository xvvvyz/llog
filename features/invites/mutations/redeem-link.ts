import * as permissions from '@/domain/teams/permissions';
import { db } from '@/lib/db';
import { id } from '@instantdb/react-native';
import * as inviteLink from '@/features/invites/lib/invite-link';

export const redeemInviteLink = async ({ token }: { token: string }) => {
  const auth = await db.getAuth();
  if (!auth) throw new Error('Sign in to redeem invite links');

  const { data: inviteData } = await db.queryOnce(
    {
      invites: {
        $: { fields: ['id' as const, 'role' as const], where: { token } },
        team: { $: { fields: ['id' as const] } },
        logs: { $: { fields: ['id' as const] } },
      },
    },
    { ruleParams: inviteLink.getInviteRuleParams(token) }
  );

  const invite = inviteData.invites?.[0];
  if (!invite?.id) throw new Error('Invite link not found');
  const teamId = invite.team?.id;
  if (!teamId) throw new Error('Invalid invite link');

  const [{ data: roleData }, { data: profileData }] = await Promise.all([
    db.queryOnce({
      roles: { $: { where: { team: teamId, userId: auth.id } } },
    }),
    db.queryOnce({
      profiles: { $: { fields: ['id' as const], where: { user: auth.id } } },
    }),
  ]);

  const profileId = profileData.profiles?.[0]?.id;

  const result = inviteLink.buildRedeemInviteLinkTransactions({
    db,
    existingRole: roleData.roles?.[0],
    invite,
    profileId,
    roleId: id(),
    token,
    userId: auth.id,
  });

  if (result.transactions.length) await db.transact(result.transactions);

  if (profileId && permissions.isManagedRole(result.role)) {
    const { data: logsData } = await db.queryOnce({
      logs: { $: { fields: ['id' as const], where: { team: result.teamId } } },
    });

    const logTransactions = logsData.logs.map((log) =>
      db.tx.logs[log.id].link({ profiles: profileId })
    );

    if (logTransactions.length) await db.transact(logTransactions);
  }

  return {
    logIds: result.logIds,
    status: result.status,
    teamId: result.teamId,
  };
};
