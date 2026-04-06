import { Button } from '@/components/ui/button';
import * as Menu from '@/components/ui/dropdown-menu';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useSheetManager } from '@/context/sheet-manager';
import { Role } from '@/enums/roles';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCopy } from '@/hooks/use-copy';
import { createInviteLink } from '@/mutations/create-invite-link';
import { useMyRole } from '@/queries/use-my-role';
import { useTeamInviteLinks } from '@/queries/use-team-invite-links';
import { useTeamMembers } from '@/queries/use-team-members';
import { useUi } from '@/queries/use-ui';
import { UI } from '@/theme/ui';
import { getInviteUrl } from '@/utilities/invite-url';
import {
  Check,
  Copy,
  NotePencil,
  QrCode,
  Tag,
  Trash,
  Users,
} from 'phosphor-react-native';
import { ReactNode, useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, ViewStyle } from 'react-native';

const InviteItems = ({ id }: { id?: string }) => {
  const colorScheme = useColorScheme();
  const sheetManager = useSheetManager();
  const { activeTeamId } = useUi();
  const { inviteLinks } = useTeamInviteLinks();
  const { onOpenChange } = Menu.useContext();

  const getOrCreateLink = useCallback(async () => {
    if (!activeTeamId || !id) return null;

    const existing = inviteLinks.find((link) => {
      if (link.role !== Role.Recorder) return false;
      const logIds = link.logs?.map((l) => l.id) ?? [];
      return logIds.length === 1 && logIds[0] === id;
    });

    if (existing) return existing.token;

    const { token } = await createInviteLink({
      teamId: activeTeamId,
      role: Role.Recorder,
      logIds: [id],
    });

    return token;
  }, [activeTeamId, id, inviteLinks]);

  const { copy, copied } = useCopy();

  const [loadingAction, setLoadingAction] = useState<'copy' | 'qr' | null>(
    null
  );

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
          <ActivityIndicator
            size={16}
            color={UI[colorScheme].mutedForeground}
          />
        ) : (
          <Icon className="text-placeholder" icon={copied ? Check : Copy} />
        )}
        <Text>
          {copied
            ? 'Copied!'
            : loadingAction === 'copy'
              ? 'Generating…'
              : 'Copy invite link'}
        </Text>
      </Menu.Item>
      <Menu.Item closeOnPress={false} onPress={handleShowQr}>
        {loadingAction === 'qr' ? (
          <ActivityIndicator
            size={16}
            color={UI[colorScheme].mutedForeground}
          />
        ) : (
          <Icon className="text-placeholder" icon={QrCode} />
        )}
        <Text>{loadingAction === 'qr' ? 'Generating…' : 'Show invite QR'}</Text>
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
  children: ReactNode;
  contentClassName?: string;
  contentStyle?: ViewStyle;
  id?: string;
  triggerWrapperClassName?: string;
}) => {
  const { canManage } = useMyRole();
  const sheetManager = useSheetManager();
  const { members } = useTeamMembers();

  const hasRecorders = useMemo(
    () => members.some((m) => m.role === Role.Recorder),
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
          <Text>Edit</Text>
        </Menu.Item>
        <Menu.Item onPress={() => sheetManager.open('log-tags', id)}>
          <Icon className="text-placeholder" icon={Tag} />
          <Text>Tags</Text>
        </Menu.Item>
        {hasRecorders && (
          <Menu.Item onPress={() => sheetManager.open('log-members', id)}>
            <Icon className="text-placeholder" icon={Users} />
            <Text>Recorders</Text>
          </Menu.Item>
        )}
        <Menu.Separator />
        <InviteItems id={id} />
        <Menu.Separator />
        <Menu.Item onPress={() => sheetManager.open('log-delete', id)}>
          <Icon className="text-destructive" icon={Trash} />
          <Text className="text-destructive">Delete</Text>
        </Menu.Item>
      </Menu.Content>
    </Menu.Root>
  );
};
