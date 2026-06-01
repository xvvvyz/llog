import { Role } from '@/domain/teams/role';
import * as permissions from '@/domain/teams/permissions';
import { db } from '@/lib/db';
import * as inviteLink from '@/domain/invites/invite-link';

export { normalizeInviteLogIds } from '@/domain/invites/invite-link';

export const getInviteRuleParams = (token: string) => ({ inviteToken: token });

export const getInviteKey = ({
  role,
  teamId,
  token,
}: {
  role: string;
  teamId: string;
  token: string;
}) => `${token}_${role}_${teamId}`;

const getRoleKey = ({
  role,
  teamId,
  userId,
}: {
  role: string;
  teamId: string;
  userId: string;
}) => `${role}_${userId}_${teamId}`;

type InviteProfile = {
  avatarSeedId?: string | null;
  id?: string;
  image?: { uri?: string | null } | null;
  name?: string | null;
};

type InviteRecord = {
  id?: string;
  role?: string | null;
  team?: {
    id?: string;
    name?: string | null;
    roles?: {
      role?: string | null;
      user?: { profile?: InviteProfile | null } | null;
    }[];
  } | null;
  logs?: { id?: string; name?: string | null; profiles?: InviteProfile[] }[];
};

const profileInfo = (profile?: InviteProfile | null) => {
  if (!profile?.id) return;

  return {
    avatarSeedId: profile.avatarSeedId ?? undefined,
    id: profile.id,
    image: profile.image?.uri ?? undefined,
    name: profile.name ?? undefined,
  };
};

export const buildInviteLinkInfo = (
  invite?: InviteRecord | null
): inviteLink.InviteLinkInfo => {
  if (
    !invite?.id ||
    !invite.team?.id ||
    !inviteLink.hasValidInviteLogScope(invite)
  ) {
    return { isValid: false };
  }

  const adminMembers = (invite.team.roles ?? [])
    .filter((role) => permissions.isManagedRole(role.role))
    .map((role) => profileInfo(role.user?.profile))
    .filter((profile): profile is NonNullable<typeof profile> => !!profile);

  const logMembers = (invite.logs ?? []).flatMap((log) =>
    (log.profiles ?? [])
      .map(profileInfo)
      .filter((profile): profile is NonNullable<typeof profile> => !!profile)
  );

  const members =
    invite.role === Role.Member
      ? [...adminMembers, ...logMembers]
      : adminMembers;

  const uniqueMembers = [
    ...new Map(members.map((member) => [member.id, member])).values(),
  ];

  return {
    isValid: true,
    logNames: invite.logs?.map((log) => log.name).filter(Boolean) as string[],
    members: uniqueMembers,
    role: invite.role as Role,
    teamId: invite.team.id,
    teamName: invite.team.name ?? undefined,
  };
};

export const getInviteLinkInfo = async (token: string) => {
  const { data } = await db.queryOnce(
    {
      invites: {
        $: { fields: ['id' as const, 'role' as const], where: { token } },
        team: {
          $: { fields: ['id' as const, 'name' as const] },
          roles: {
            $: { where: { role: { $in: [Role.Owner, Role.Admin] } } },
            user: { profile: { image: {} } },
          },
        },
        logs: {
          $: { fields: ['id' as const, 'name' as const] },
          profiles: { image: {} },
        },
      },
    },
    { ruleParams: getInviteRuleParams(token) }
  );

  return buildInviteLinkInfo(data.invites?.[0] as InviteRecord | undefined);
};

type DbWithInviteTransactions = Pick<typeof db, 'tx'>;

type RedeemInvite = {
  id?: string;
  role?: string | null;
  team?: { id?: string } | null;
  logs?: { id?: string }[] | null;
};

type ExistingRole = { id: string; role?: string | null };

export const buildRedeemInviteLinkTransactions = ({
  db: dbClient,
  existingRole,
  invite,
  profileId,
  roleId,
  token,
  userId,
}: {
  db: DbWithInviteTransactions;
  existingRole?: ExistingRole;
  invite: RedeemInvite;
  profileId?: string;
  roleId: string;
  token: string;
  userId: string;
}) => {
  const teamId = invite.team?.id;
  const invitedRole = invite.role;

  if (
    !teamId ||
    (invitedRole !== Role.Admin && invitedRole !== Role.Member) ||
    !inviteLink.hasValidInviteLogScope(invite)
  ) {
    throw new Error('Invalid invite link');
  }

  const params = getInviteRuleParams(token);

  const logIds =
    invitedRole === Role.Member ? inviteLink.getInviteLogIds(invite) : [];

  const effectiveRole = existingRole
    ? permissions.getInviteRedemptionRole({
        currentRole: existingRole.role,
        invitedRole,
      })
    : invitedRole;

  const linkedLogIds = permissions.isManagedRole(effectiveRole) ? [] : logIds;

  const logTransactions =
    profileId && linkedLogIds.length
      ? linkedLogIds.map((logId) =>
          dbClient.tx.logs[logId]
            .ruleParams(params)
            .link({ profiles: profileId })
        )
      : [];

  if (existingRole) {
    const desiredRole = effectiveRole;

    const roleTransactions =
      desiredRole && desiredRole !== existingRole.role
        ? [
            dbClient.tx.roles[existingRole.id]
              .ruleParams(params)
              .update({
                key: getRoleKey({ role: desiredRole, teamId, userId }),
                role: desiredRole,
                teamId,
                userId,
              }),
          ]
        : [];

    return {
      logIds,
      role: effectiveRole,
      status:
        desiredRole && desiredRole !== existingRole.role
          ? 'role_updated'
          : 'logs_added',
      teamId,
      transactions: [...roleTransactions, ...logTransactions],
    };
  }

  return {
    logIds,
    role: effectiveRole,
    status: 'joined',
    teamId,
    transactions: [
      dbClient.tx.roles[roleId]
        .ruleParams(params)
        .update({
          key: getRoleKey({ role: invitedRole, teamId, userId }),
          role: invitedRole,
          teamId,
          userId,
        })
        .link({ team: teamId, user: userId }),
      ...logTransactions,
    ],
  };
};
