import { findMemberInviteByLogs } from '@/features/invites/lib/invite-matching';
import { getInviteUrl } from '@/features/invites/lib/invite-url';
import { createInviteLink } from '@/features/invites/mutations/create-invite-link';
import { useTeamInvites } from '@/features/invites/queries/use-team-invite-links';
import { useLog } from '@/features/logs/queries/use-log';
import { Role } from '@/features/teams/types/role';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCopy } from '@/hooks/use-copy';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { UI } from '@/theme/ui';
import * as Menu from '@/ui/dropdown-menu';
import { Icon } from '@/ui/icon';
import { Text } from '@/ui/text';
import { Check } from 'phosphor-react-native/lib/module/icons/Check';
import { Copy } from 'phosphor-react-native/lib/module/icons/Copy';
import { QrCode } from 'phosphor-react-native/lib/module/icons/QrCode';
import * as React from 'react';
import { ActivityIndicator, View } from 'react-native';

export const LogDropdownMenuInviteItems = ({ id }: { id?: string }) => {
  const colorScheme = useColorScheme();
  const sheetManager = useSheetManager();
  const log = useLog({ id });
  const { invites } = useTeamInvites({ teamId: log.teamId });
  const { onOpenChange } = Menu.useContext();
  const { copy, copied } = useCopy();

  const [loadingAction, setLoadingAction] = React.useState<
    'copy' | 'qr' | null
  >(null);

  const getOrCreateLink = React.useCallback(async () => {
    if (!log.teamId || !id) return null;

    const existing = findMemberInviteByLogs(invites, [id]);
    if (existing) return existing.token;

    const { token } = await createInviteLink({
      teamId: log.teamId,
      role: Role.Member,
      logIds: [id],
    });

    return token;
  }, [id, invites, log.teamId]);

  const handleCopyLink = React.useCallback(async () => {
    setLoadingAction('copy');

    try {
      const token = await getOrCreateLink();
      if (token) await copy(getInviteUrl(token));
    } finally {
      setLoadingAction(null);
    }
  }, [copy, getOrCreateLink]);

  const handleShowQr = React.useCallback(async () => {
    setLoadingAction('qr');

    try {
      const token = await getOrCreateLink();

      if (token) {
        onOpenChange(false);
        sheetManager.open('invite-qr', getInviteUrl(token));
      }
    } finally {
      setLoadingAction(null);
    }
  }, [getOrCreateLink, onOpenChange, sheetManager]);

  return (
    <>
      <Menu.Item closeOnPress={false} onPress={handleCopyLink}>
        {loadingAction === 'copy' ? (
          <View className="size-5 items-center justify-center">
            <ActivityIndicator
              size={16}
              color={UI[colorScheme].mutedForeground}
            />
          </View>
        ) : (
          <Icon className="text-placeholder" icon={copied ? Check : Copy} />
        )}
        <Text className={loadingAction === 'copy' ? 'text-placeholder' : ''}>
          {copied ? 'Copied!' : 'Invite link'}
        </Text>
      </Menu.Item>
      <Menu.Item closeOnPress={false} onPress={handleShowQr}>
        {loadingAction === 'qr' ? (
          <View className="size-5 items-center justify-center">
            <ActivityIndicator
              size={16}
              color={UI[colorScheme].mutedForeground}
            />
          </View>
        ) : (
          <Icon className="text-placeholder" icon={QrCode} />
        )}
        <Text className={loadingAction === 'qr' ? 'text-placeholder' : ''}>
          Invite QR
        </Text>
      </Menu.Item>
    </>
  );
};
