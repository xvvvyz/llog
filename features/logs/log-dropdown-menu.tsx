import { LogDropdownMenuInviteItems } from '@/features/invites/log-dropdown-menu-invite-items';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { isMemberRole } from '@/lib/permissions';
import { useLog } from '@/queries/use-log';
import { useMyRole } from '@/queries/use-my-role';
import { useTeamMembers } from '@/queries/use-team-members';
import { Button } from '@/ui/button';
import * as Menu from '@/ui/dropdown-menu';
import { Icon } from '@/ui/icon';
import { Text } from '@/ui/text';
import { NotePencil } from 'phosphor-react-native/lib/module/icons/NotePencil';
import { Tag } from 'phosphor-react-native/lib/module/icons/Tag';
import { Trash } from 'phosphor-react-native/lib/module/icons/Trash';
import { Users } from 'phosphor-react-native/lib/module/icons/Users';
import * as React from 'react';
import { ViewStyle } from 'react-native';

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
        <LogDropdownMenuInviteItems id={id} />
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
