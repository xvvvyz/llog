import { isMemberRole } from '@/domain/teams/permissions';
import { Role } from '@/domain/teams/role';
import { getInviteUrl } from '@/features/invites/lib/url';
import { createInviteLink } from '@/features/invites/mutations/create-link';
import type { useTeamInvites } from '@/features/invites/queries/use-team-links';
import { useLogColor } from '@/features/logs/hooks/use-color';
import type { useTeamMembers } from '@/features/teams/queries/use-team-members';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { Spinner } from '@/ui/spinner';
import { Text } from '@/ui/text';
import * as React from 'react';
import { View } from 'react-native';
import { NotePencil, UserPlus, UsersThree } from 'phosphor-react-native';

const ACTION_BUTTON_WRAPPER_CLASS_NAME = 'w-32 self-center';

type EmptyStateProps = {
  canManage: boolean;
  invites: ReturnType<typeof useTeamInvites>['invites'];
  logId: string;
  members: ReturnType<typeof useTeamMembers>['members'];
  networkActionsEnabled?: boolean;
  showManagerActions?: boolean;
  teamId: string;
};

export const EmptyState = ({
  canManage,
  invites,
  logId,
  members,
  networkActionsEnabled = true,
  showManagerActions = canManage,
  teamId,
}: EmptyStateProps) => {
  const logColor = useLogColor({ id: logId });
  const sheetManager = useSheetManager();
  const hasMembers = members.some((member) => isMemberRole(member.role));
  const [isInviteLoading, setIsInviteLoading] = React.useState(false);

  const getOrCreateLink = React.useCallback(async () => {
    const existing = invites.find((link) => {
      if (link.role !== Role.Member) return false;
      const logIds = link.logs?.map((l) => l.id) ?? [];
      return logIds.length === 1 && logIds[0] === logId;
    });

    if (existing) return existing;

    const invite = await createInviteLink({
      teamId,
      role: Role.Member,
      logIds: [logId],
    });

    return { ...invite, teamId };
  }, [teamId, logId, invites]);

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
    if (!networkActionsEnabled) return;
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
  }, [getOrCreateInvite, networkActionsEnabled, sheetManager]);

  return (
    <View className="flex-1 mx-auto max-w-52 w-full px-3 py-8 gap-3 justify-center">
      {showManagerActions ? (
        <>
          <Button
            className="justify-between"
            disabled={!canManage}
            onPress={() => sheetManager.open('log-edit', logId)}
            size="xs"
            variant="secondary"
            wrapperClassName={ACTION_BUTTON_WRAPPER_CLASS_NAME}
          >
            <Text>Edit</Text>
            <Icon className="-mr-0.5" icon={NotePencil} />
          </Button>
          {hasMembers && (
            <Button
              className="justify-between"
              disabled={!networkActionsEnabled}
              onPress={() => sheetManager.open('log-members', logId)}
              size="xs"
              variant="secondary"
              wrapperClassName={ACTION_BUTTON_WRAPPER_CLASS_NAME}
            >
              <Text>Members</Text>
              <Icon className="-mr-0.5" icon={UsersThree} />
            </Button>
          )}
          <Button
            className="justify-between"
            disabled={!networkActionsEnabled || isInviteLoading}
            onPress={handleInvite}
            size="xs"
            variant="secondary"
            wrapperClassName={ACTION_BUTTON_WRAPPER_CLASS_NAME}
          >
            <Text>Invite</Text>
            {isInviteLoading ? (
              <Spinner className="-mr-0.5" size="xs" />
            ) : (
              <Icon className="-mr-0.5" icon={UserPlus} />
            )}
          </Button>
        </>
      ) : null}
      <Button
        className="active:opacity-90 web:hover:opacity-90"
        size="xs"
        style={{ backgroundColor: logColor.default }}
        wrapperClassName="w-32 self-center"
        onPress={() =>
          sheetManager.open('record-create', logId, undefined, { teamId })
        }
      >
        <Text className="text-white">Record</Text>
      </Button>
    </View>
  );
};
