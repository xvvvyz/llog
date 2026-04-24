import { getInviteUrl } from '@/features/invites/lib/invite-url';
import { createInviteLink } from '@/features/invites/mutations/create-invite-link';
import { useTeamInvites } from '@/features/invites/queries/use-team-invite-links';
import { useLogColor } from '@/features/logs/hooks/use-log-color';
import { useLog } from '@/features/logs/queries/use-log';
import { isMemberRole } from '@/features/teams/lib/permissions';
import { useMyRole } from '@/features/teams/queries/use-my-role';
import { useTeamMembers } from '@/features/teams/queries/use-team-members';
import { Role } from '@/features/teams/types/role';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCopy } from '@/hooks/use-copy';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { UI } from '@/theme/ui';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { Text } from '@/ui/text';
import * as React from 'react';
import { ActivityIndicator, View } from 'react-native';

import {
  Check,
  Copy,
  NotePencil,
  Plus,
  QrCode,
  Users,
} from 'phosphor-react-native';

export const LogEmptyState = ({ logId }: { logId: string }) => {
  const log = useLog({ id: logId });
  const { canManage } = useMyRole({ teamId: log.teamId });
  const colorScheme = useColorScheme();
  const logColor = useLogColor({ id: logId });
  const sheetManager = useSheetManager();
  const { members } = useTeamMembers({ teamId: log.teamId });
  const { invites } = useTeamInvites({ teamId: log.teamId });
  const { copy, copied } = useCopy();
  const hasMembers = members.some((member) => isMemberRole(member.role));

  const [loadingAction, setLoadingAction] = React.useState<
    'copy' | 'qr' | null
  >(null);

  const getOrCreateLink = React.useCallback(async () => {
    if (!log.teamId) return null;

    const existing = invites.find((link) => {
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
  }, [log.teamId, logId, invites]);

  const getOrCreateInviteUrl = React.useCallback(async () => {
    const token = await getOrCreateLink();
    if (!token) throw new Error('Failed to create invite link');
    return getInviteUrl(token);
  }, [getOrCreateLink]);

  const handleCopyLink = React.useCallback(async () => {
    setLoadingAction('copy');

    try {
      await copy(getOrCreateInviteUrl);
    } finally {
      setLoadingAction(null);
    }
  }, [copy, getOrCreateInviteUrl]);

  const handleShowQr = React.useCallback(async () => {
    setLoadingAction('qr');

    try {
      sheetManager.open('invite-qr', await getOrCreateInviteUrl());
    } finally {
      setLoadingAction(null);
    }
  }, [getOrCreateInviteUrl, sheetManager]);

  return (
    <View className="flex-1 mx-auto max-w-[13rem] w-full px-3 py-8 gap-3 justify-center">
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
                color={UI[colorScheme].mutedForeground}
                size={16}
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
                color={UI[colorScheme].mutedForeground}
                size={16}
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
        className="mt-3 active:opacity-90 web:hover:opacity-90"
        onPress={() => sheetManager.open('record-create', logId)}
        size="xs"
        style={{ backgroundColor: logColor.default }}
      >
        <Icon className="-ml-0.5 text-contrast-foreground" icon={Plus} />
        <Text className="text-contrast-foreground">Record</Text>
      </Button>
    </View>
  );
};
