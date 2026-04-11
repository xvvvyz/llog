import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useSheetManager } from '@/context/sheet-manager';
import { Role } from '@/enums/roles';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCopy } from '@/hooks/use-copy';
import { useLogColor } from '@/hooks/use-log-color';
import { createInviteLink } from '@/mutations/create-invite-link';
import { useMyRole } from '@/queries/use-my-role';
import { useTeamInviteLinks } from '@/queries/use-team-invite-links';
import { useUi } from '@/queries/use-ui';
import { UI } from '@/theme/ui';
import { getInviteUrl } from '@/utilities/invite-url';
import {
  Check,
  Copy,
  NotePencil,
  Plus,
  QrCode,
  Users,
} from 'phosphor-react-native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

export const LogEmptyState = ({ logId }: { logId: string }) => {
  const { canManage } = useMyRole();
  const colorScheme = useColorScheme();
  const logColor = useLogColor({ id: logId });
  const sheetManager = useSheetManager();
  const { activeTeamId } = useUi();
  const { inviteLinks } = useTeamInviteLinks();
  const { copy, copied } = useCopy();

  const [loadingAction, setLoadingAction] = useState<'copy' | 'qr' | null>(
    null
  );

  const getOrCreateLink = useCallback(async () => {
    if (!activeTeamId) return null;

    const existing = inviteLinks.find((link) => {
      if (link.role !== Role.Member) return false;
      const logIds = link.logs?.map((l) => l.id) ?? [];
      return logIds.length === 1 && logIds[0] === logId;
    });

    if (existing) return existing.token;

    const { token } = await createInviteLink({
      teamId: activeTeamId,
      role: Role.Member,
      logIds: [logId],
    });

    return token;
  }, [activeTeamId, logId, inviteLinks]);

  const handleCopyLink = useCallback(async () => {
    setLoadingAction('copy');

    try {
      const token = await getOrCreateLink();
      if (token) await copy(getInviteUrl(token));
    } finally {
      setLoadingAction(null);
    }
  }, [getOrCreateLink, copy]);

  const handleShowQr = useCallback(async () => {
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
          <Button
            className="justify-between"
            onPress={() => sheetManager.open('log-members', logId)}
            size="xs"
            variant="secondary"
          >
            <Text>Manage members</Text>
            <Icon className="-mr-0.5" icon={Users} />
          </Button>
        </>
      )}
      <Button
        className="text-white"
        onPress={() => sheetManager.open('record-create', logId)}
        size="xs"
        style={{ backgroundColor: logColor.default }}
      >
        <Icon className="-ml-0.5 text-white" icon={Plus} />
        <Text className="text-white">Record something</Text>
      </Button>
    </View>
  );
};
