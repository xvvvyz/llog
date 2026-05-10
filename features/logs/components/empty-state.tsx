import { isMemberRole } from '@/domain/teams/permissions';
import { Role } from '@/domain/teams/role';
import { getInviteUrl } from '@/features/invites/lib/url';
import { createInviteLink } from '@/features/invites/mutations/create-link';
import { useTeamInvites } from '@/features/invites/queries/use-team-links';
import { useLogColor } from '@/features/logs/hooks/use-color';
import { useLog } from '@/features/logs/queries/use-log';
import { useMyRole } from '@/features/teams/queries/use-my-role';
import { useTeamMembers } from '@/features/teams/queries/use-team-members';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { Spinner } from '@/ui/spinner';
import { Text } from '@/ui/text';
import * as React from 'react';
import { View } from 'react-native';
import { NotePencil, Plus, UserPlus, UsersThree } from 'phosphor-react-native';

export const EmptyState = ({ logId }: { logId: string }) => {
  const log = useLog({ id: logId });

  const { canManage, isLoading: roleLoading } = useMyRole({
    teamId: log.teamId,
  });

  const logColor = useLogColor({ id: logId });
  const sheetManager = useSheetManager();

  const { members, isLoading: membersLoading } = useTeamMembers({
    teamId: log.teamId,
  });

  const { invites, isLoading: invitesLoading } = useTeamInvites({
    teamId: log.teamId,
  });

  const hasMembers = members.some((member) => isMemberRole(member.role));

  const actionsLoading =
    roleLoading || (canManage && (membersLoading || invitesLoading));

  const [isInviteLoading, setIsInviteLoading] = React.useState(false);

  const getOrCreateLink = React.useCallback(async () => {
    if (!log.teamId) return null;

    const existing = invites.find((link) => {
      if (link.role !== Role.Member) return false;
      const logIds = link.logs?.map((l) => l.id) ?? [];
      return logIds.length === 1 && logIds[0] === logId;
    });

    if (existing) return existing;

    const invite = await createInviteLink({
      teamId: log.teamId,
      role: Role.Member,
      logIds: [logId],
    });

    return { ...invite, teamId: log.teamId };
  }, [log.teamId, logId, invites]);

  const getOrCreateInvite = React.useCallback(async () => {
    const invite = await getOrCreateLink();

    if (!invite?.id || !invite.token || !invite.teamId) {
      throw new Error('Failed to create invite link');
    }

    return {
      id: invite.id,
      teamId: invite.teamId,
      url: getInviteUrl(invite.token),
    };
  }, [getOrCreateLink]);

  const handleInvite = React.useCallback(async () => {
    setIsInviteLoading(true);

    try {
      const invite = await getOrCreateInvite();

      sheetManager.open('invite', invite.url, undefined, {
        inviteId: invite.id,
        teamId: invite.teamId,
      });
    } finally {
      setIsInviteLoading(false);
    }
  }, [getOrCreateInvite, sheetManager]);

  return (
    <View className="flex-1 mx-auto max-w-[13rem] w-full px-3 py-8 gap-3 justify-center">
      {actionsLoading ? (
        <View className="py-2 items-center">
          <Spinner />
        </View>
      ) : canManage ? (
        <>
          <Button
            className="justify-between"
            onPress={() => sheetManager.open('log-edit', logId)}
            size="xs"
            variant="secondary"
          >
            <Text>Edit details</Text>
            <Icon className="-mr-0.5" icon={NotePencil} />
          </Button>
          <Button
            className="justify-between"
            onPress={handleInvite}
            size="xs"
            variant="secondary"
          >
            <Text>Invite members</Text>
            {isInviteLoading ? (
              <Spinner className="-mr-0.5" size="xs" />
            ) : (
              <Icon className="-mr-0.5" icon={UserPlus} />
            )}
          </Button>
          {hasMembers && (
            <Button
              className="justify-between"
              onPress={() => sheetManager.open('log-members', logId)}
              size="xs"
              variant="secondary"
            >
              <Text>Add members</Text>
              <Icon className="-mr-0.5" icon={UsersThree} />
            </Button>
          )}
        </>
      ) : null}
      {!actionsLoading && (
        <Button
          className="mt-3 active:opacity-90 web:hover:opacity-90"
          onPress={() => sheetManager.open('record-create', logId)}
          size="xs"
          style={{ backgroundColor: logColor.default }}
        >
          <Icon className="-ml-0.5 text-white" icon={Plus} />
          <Text className="text-white">Record</Text>
        </Button>
      )}
    </View>
  );
};
