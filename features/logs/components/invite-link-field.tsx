import { Role } from '@/domain/teams/role';
import { InviteLinkField } from '@/features/invites/components/invite-link-field';
import { findMemberInviteByLogs } from '@/features/invites/lib/matching';
import { createInviteLink } from '@/features/invites/mutations/create-link';
import { useTeamInvites } from '@/features/invites/queries/use-team-links';
import * as React from 'react';

export const LogInviteLinkField = ({
  logId,
  teamId,
}: {
  logId?: string;
  teamId?: string | null;
}) => {
  const { invites, isLoading: invitesLoading } = useTeamInvites({ teamId });

  const invite = React.useMemo(
    () => (logId ? findMemberInviteByLogs(invites, [logId]) : undefined),
    [invites, logId]
  );

  const getOrCreateInvite = React.useCallback(async () => {
    if (!logId || !teamId) return;
    if (invite?.id && invite.teamId && invite.token) return invite;

    const createdInvite = await createInviteLink({
      logIds: [logId],
      role: Role.Member,
      teamId,
    });

    return { ...createdInvite, teamId };
  }, [invite, logId, teamId]);

  return (
    <InviteLinkField
      createLabel="Invite member"
      disabled={!logId}
      iconPosition="trailing"
      invite={invite}
      isLoading={invitesLoading}
      onGetOrCreateInvite={getOrCreateInvite}
      size="sm"
      teamId={teamId}
      viewLabel="Invite member"
    />
  );
};
