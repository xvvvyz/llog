import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Sheet } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCopy } from '@/hooks/use-copy';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { createInviteLink } from '@/mutations/create-invite-link';
import { useTeamInviteLinks } from '@/queries/use-team-invite-links';
import { useUi } from '@/queries/use-ui';
import { SPECTRUM } from '@/theme/spectrum';
import { Role } from '@/types/role';
import { db } from '@/utilities/db';
import { getInviteUrl } from '@/utilities/invite-url';
import * as React from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';

export const InviteLogsSheet = () => {
  const [isLoading, setIsLoading] = React.useState(false);
  const sheetManager = useSheetManager();
  const action = sheetManager.getId('invite-logs') as 'copy' | 'qr' | undefined;
  const colorScheme = useColorScheme();
  const dismissTimer = React.useRef<ReturnType<typeof setTimeout>>(undefined);
  const open = sheetManager.isOpen('invite-logs');
  const { activeTeamId } = useUi();
  const { copy, copied } = useCopy();
  const { inviteLinks } = useTeamInviteLinks();

  const [selectedLogIds, setSelectedLogIds] = React.useState<Set<string>>(
    new Set()
  );

  React.useEffect(() => {
    if (open) {
      setSelectedLogIds(new Set());
      setIsLoading(false);
    }
  }, [open]);

  const { data } = db.useQuery(
    activeTeamId
      ? {
          logs: {
            $: {
              order: { name: 'asc' },
              where: { team: activeTeamId },
            },
          },
        }
      : null
  );

  const logs = data?.logs ?? [];

  const toggleLog = React.useCallback((logId: string) => {
    setSelectedLogIds((prev) => {
      const next = new Set(prev);
      if (next.has(logId)) next.delete(logId);
      else next.add(logId);
      return next;
    });
  }, []);

  const findMatchingLink = React.useCallback(
    (logIds: string[]) => {
      const sorted = [...logIds].sort();

      return inviteLinks.find((link) => {
        if (link.role !== Role.Member) return false;
        const linkLogIds = [...(link.logs?.map((l) => l.id) ?? [])].sort();
        if (linkLogIds.length !== sorted.length) return false;
        return linkLogIds.every((id, i) => id === sorted[i]);
      });
    },
    [inviteLinks]
  );

  const handleConfirm = React.useCallback(async () => {
    if (!activeTeamId || selectedLogIds.size === 0) return;
    setIsLoading(true);

    try {
      const logIds = [...selectedLogIds];
      const existing = findMatchingLink(logIds);

      const token = existing
        ? existing.token
        : (
            await createInviteLink({
              teamId: activeTeamId,
              role: Role.Member,
              logIds,
            })
          ).token;

      const url = getInviteUrl(token);

      if (action === 'qr') {
        sheetManager.close('invite-logs');
        setTimeout(() => sheetManager.open('invite-qr', url), 300);
        return;
      }

      await copy(url);
      setIsLoading(false);

      dismissTimer.current = setTimeout(() => {
        setSelectedLogIds(new Set());
        sheetManager.close('invite-logs');
      }, 1500);
    } catch {
      setIsLoading(false);
    }
  }, [
    activeTeamId,
    selectedLogIds,
    findMatchingLink,
    action,
    sheetManager,
    copy,
  ]);

  const handleDismiss = React.useCallback(() => {
    clearTimeout(dismissTimer.current);
    sheetManager.close('invite-logs');
  }, [sheetManager]);

  return (
    <Sheet onDismiss={handleDismiss} open={open} portalName="invite-logs">
      <ScrollView
        contentContainerClassName="w-full p-8 sm:mx-auto sm:max-w-sm"
        keyboardShouldPersistTaps="always"
      >
        {logs.map((log) => {
          const isSelected = selectedLogIds.has(log.id);
          const color = SPECTRUM[colorScheme][log.color ?? 11];

          return (
            <View
              className="flex-row items-center justify-between py-2.5"
              key={log.id}
            >
              <View className="flex-row items-center gap-3">
                <View
                  className="size-4 rounded-md"
                  style={{ backgroundColor: color.default }}
                />
                <Text numberOfLines={1}>{log.name}</Text>
              </View>
              <Checkbox
                checked={isSelected}
                className="size-8 border-0"
                onCheckedChange={() => toggleLog(log.id)}
              />
            </View>
          );
        })}
        <Button
          disabled={selectedLogIds.size === 0 || isLoading}
          onPress={handleConfirm}
          wrapperClassName="mt-4"
        >
          {isLoading ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Text>
              {copied
                ? 'Copied!'
                : action === 'qr'
                  ? 'Show QR code'
                  : 'Copy link'}
            </Text>
          )}
        </Button>
      </ScrollView>
    </Sheet>
  );
};
