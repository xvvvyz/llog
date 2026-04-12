import { Button } from '@/components/ui/button';
import * as Menu from '@/components/ui/dropdown-menu';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCopy } from '@/hooks/use-copy';
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
import { QrCode } from 'phosphor-react-native/lib/module/icons/QrCode';
import { Tag } from 'phosphor-react-native/lib/module/icons/Tag';
import { Trash } from 'phosphor-react-native/lib/module/icons/Trash';
import { Users } from 'phosphor-react-native/lib/module/icons/Users';
import * as React from 'react';
import { ActivityIndicator, View, ViewStyle } from 'react-native';

const InviteItems = ({ id }: { id?: string }) => {
  const colorScheme = useColorScheme();
  const sheetManager = useSheetManager();
  const log = useLog({ id });
  const { inviteLinks } = useTeamInviteLinks({ teamId: log.teamId });
  const { onOpenChange } = Menu.useContext();

  const getOrCreateLink = React.useCallback(async () => {
    if (!log.teamId || !id) return null;

    const existing = inviteLinks.find((link) => {
      if (link.role !== Role.Member) return false;
      const logIds = link.logs?.map((l) => l.id) ?? [];
      return logIds.length === 1 && logIds[0] === id;
    });

    if (existing) return existing.token;

    const { token } = await createInviteLink({
      teamId: log.teamId,
      role: Role.Member,
      logIds: [id],
    });

    return token;
  }, [log.teamId, id, inviteLinks]);

  const { copy, copied } = useCopy();

  const [loadingAction, setLoadingAction] = React.useState<
    'copy' | 'qr' | null
  >(null);

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

export const LogDropdownMenu = ({
  children,
  contentClassName,
  contentStyle,
  id,
  triggerWrapperClassName,
}: {
  children: React.ReactNode;
  contentClassName?: string;
  contentStyle?: ViewStyle;
  id?: string;
  triggerWrapperClassName?: string;
}) => {
  const log = useLog({ id });
  const { canManage } = useMyRole({ teamId: log.teamId });
  const sheetManager = useSheetManager();
  const { members } = useTeamMembers({ teamId: log.teamId });

  const hasMembers = React.useMemo(
    () => members.some((m) => isMemberRole(m.role)),
    [members]
  );

  if (!canManage) return null;

  return (
    <Menu.Root>
      <Menu.Trigger asChild>
        <Button
          className="size-11"
          size="icon"
          variant="link"
          wrapperClassName={triggerWrapperClassName}
        >
          {children}
        </Button>
      </Menu.Trigger>
      <Menu.Content
        align="end"
        className={contentClassName}
        style={contentStyle}
      >
        <Menu.Item onPress={() => sheetManager.open('log-edit', id)}>
          <Icon className="text-placeholder" icon={NotePencil} />
          <Text>Details</Text>
        </Menu.Item>
        <Menu.Item onPress={() => sheetManager.open('log-tags', id)}>
          <Icon className="text-placeholder" icon={Tag} />
          <Text>Tags</Text>
        </Menu.Item>
        <Menu.Separator />
        <InviteItems id={id} />
        {hasMembers && (
          <Menu.Item onPress={() => sheetManager.open('log-members', id)}>
            <Icon className="text-placeholder" icon={Users} />
            <Text>Members</Text>
          </Menu.Item>
        )}
        <Menu.Separator />
        <Menu.Item onPress={() => sheetManager.open('log-delete', id)}>
          <Icon className="text-destructive" icon={Trash} />
          <Text className="text-destructive">Delete</Text>
        </Menu.Item>
      </Menu.Content>
    </Menu.Root>
  );
};
