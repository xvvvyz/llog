import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCopy } from '@/hooks/use-copy';
import { useLogColor } from '@/hooks/use-log-color';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { createInviteLink } from '@/mutations/create-invite-link';
import { useLog } from '@/queries/use-log';
import { useMyRole } from '@/queries/use-my-role';
import { useTeamInviteLinks } from '@/queries/use-team-invite-links';
import { useTeamMembers } from '@/queries/use-team-members';
import { UI } from '@/theme/ui';
import { Role } from '@/types/role';
import { getInviteUrl } from '@/utilities/invite-url';
import { isMemberRole } from '@/utilities/permissions';
import { Check } from 'phosphor-react-native/lib/module/icons/Check';
import { Copy } from 'phosphor-react-native/lib/module/icons/Copy';
import { NotePencil } from 'phosphor-react-native/lib/module/icons/NotePencil';
import { Plus } from 'phosphor-react-native/lib/module/icons/Plus';
import { QrCode } from 'phosphor-react-native/lib/module/icons/QrCode';
import { Users } from 'phosphor-react-native/lib/module/icons/Users';
import * as React from 'react';
import { ActivityIndicator, View } from 'react-native';

export const LogEmptyState = ({ logId }: { logId: string }) => {
  const log = useLog({ id: logId });
  const { canManage } = useMyRole({ teamId: log.teamId });
  const colorScheme = useColorScheme();
  const logColor = useLogColor({ id: logId });
  const sheetManager = useSheetManager();
  const { members } = useTeamMembers({ teamId: log.teamId });
  const { inviteLinks } = useTeamInviteLinks({ teamId: log.teamId });
  const { copy, copied } = useCopy();
  const hasMembers = members.some((member) => isMemberRole(member.role));

  const [loadingAction, setLoadingAction] = React.useState<
    'copy' | 'qr' | null
  >(null);

  const getOrCreateLink = React.useCallback(async () => {
    if (!log.teamId) return null;

    const existing = inviteLinks.find((link) => {
      if (link.role !== Role.Member) return false;
      const logIds = link.logs?.map((l) => l.id) ?? [];
      return logIds.length === 1 && logIds[0] === logId;
    });

    if (existing) return existing.token;

    const { token } = await createInviteLink({
      teamId: log.teamId,
      role: Role.Member,
      logIds: [logId],
    });

    return token;
  }, [log.teamId, logId, inviteLinks]);

  const handleCopyLink = React.useCallback(async () => {
    setLoadingAction('copy');

    try {
      const token = await getOrCreateLink();
      if (token) await copy(getInviteUrl(token));
    } finally {
      setLoadingAction(null);
    }
  }, [getOrCreateLink, copy]);

  const handleShowQr = React.useCallback(async () => {
    setLoadingAction('qr');

    try {
      const token = await getOrCreateLink();
      if (token) sheetManager.open('invite-qr', getInviteUrl(token));
    } finally {
      setLoadingAction(null);
    }
  }, [getOrCreateLink, sheetManager]);

  return (
    <View className="mx-auto w-full max-w-[13rem] flex-1 justify-center gap-3 px-3 py-8">
      {canManage && (
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
            onPress={handleCopyLink}
            size="xs"
            variant="secondary"
          >
            <Text>
              {copied
                ? 'Copied!'
                : loadingAction === 'copy'
                  ? 'Generating…'
                  : 'Copy invite link'}
            </Text>
            {loadingAction === 'copy' ? (
              <ActivityIndicator
                size={16}
                color={UI[colorScheme].mutedForeground}
              />
            ) : (
              <Icon className="-mr-0.5" icon={copied ? Check : Copy} />
            )}
          </Button>
          <Button
            className="justify-between"
            onPress={handleShowQr}
            size="xs"
            variant="secondary"
          >
            <Text>
              {loadingAction === 'qr' ? 'Generating…' : 'Show invite QR'}
            </Text>
            {loadingAction === 'qr' ? (
              <ActivityIndicator
                size={16}
                color={UI[colorScheme].mutedForeground}
              />
            ) : (
              <Icon className="-mr-0.5" icon={QrCode} />
            )}
          </Button>
          {hasMembers && (
            <Button
              className="justify-between"
              onPress={() => sheetManager.open('log-members', logId)}
              size="xs"
              variant="secondary"
            >
              <Text>Manage members</Text>
              <Icon className="-mr-0.5" icon={Users} />
            </Button>
          )}
        </>
      )}
      <Button
        className="text-white"
        onPress={() => sheetManager.open('record-create', logId)}
        size="xs"
        style={{ backgroundColor: logColor.default }}
      >
        <Icon className="-ml-0.5 text-white" icon={Plus} />
        <Text className="text-white">Record</Text>
      </Button>
    </View>
  );
};
