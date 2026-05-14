import { Role } from '@/domain/teams/role';
import { findMemberInviteByLogs } from '@/features/invites/lib/matching';
import { getInviteUrl } from '@/features/invites/lib/url';
import { createInviteLink } from '@/features/invites/mutations/create-link';
import { useTeamInvites } from '@/features/invites/queries/use-team-links';
import { useLog } from '@/features/logs/queries/use-log';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { UI } from '@/theme/ui';
import * as Menu from '@/ui/dropdown-menu';
import { Icon } from '@/ui/icon';
import { Spinner } from '@/ui/spinner';
import { Text } from '@/ui/text';
import { UserPlus } from 'phosphor-react-native';
import * as React from 'react';
import { View } from 'react-native';

export const LogDropdownItems = ({
  disabled,
  id,
}: {
  disabled?: boolean;
  id?: string;
}) => {
  const colorScheme = useColorScheme();
  const sheetManager = useSheetManager();
  const log = useLog({ id });
  const { invites } = useTeamInvites({ teamId: log.teamId });
  const { onOpenChange } = Menu.useContext();
  const [isLoading, setIsLoading] = React.useState(false);

  const getOrCreateLink = React.useCallback(async () => {
    if (!log.teamId || !id) return null;
    const existing = findMemberInviteByLogs(invites, [id]);
    if (existing) return existing;

    const invite = await createInviteLink({
      teamId: log.teamId,
      role: Role.Member,
      logIds: [id],
    });

    return { ...invite, teamId: log.teamId };
  }, [id, invites, log.teamId]);

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
    if (disabled) return;
    setIsLoading(true);

    try {
      const invite = await getOrCreateInvite();

      sheetManager.open('invite', invite.url, undefined, {
        inviteId: invite.id,
        teamId: invite.teamId,
      });

      onOpenChange(false);
    } finally {
      setIsLoading(false);
    }
  }, [disabled, getOrCreateInvite, onOpenChange, sheetManager]);

  return (
    <Menu.Item
      closeOnPress={false}
      disabled={disabled || isLoading}
      onPress={handleInvite}
    >
      {isLoading ? (
        <View className="size-5 items-center justify-center">
          <Spinner color={UI[colorScheme].mutedForeground} size="xs" />
        </View>
      ) : (
        <Icon className="text-placeholder" icon={UserPlus} />
      )}
      <Text className={isLoading ? 'text-placeholder' : ''}>Invite</Text>
    </Menu.Item>
  );
};
