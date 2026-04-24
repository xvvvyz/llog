import { updateRole } from '@/features/teams/mutations/update-role';
import { Role } from '@/features/teams/types/role';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { UI } from '@/theme/ui';
import * as Menu from '@/ui/dropdown-menu';
import { Icon } from '@/ui/icon';
import { Text } from '@/ui/text';
import { Check, SquaresFour, UserMinus } from 'phosphor-react-native';
import * as React from 'react';
import { ActivityIndicator, View } from 'react-native';

const ROLE_LABELS: Record<string, string> = {
  [Role.Owner]: 'Owner',
  [Role.Admin]: 'Admin',
  [Role.Member]: 'Member',
};

const ASSIGNABLE_ROLES = [Role.Admin, Role.Member] as const;
type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];

export const TeamMemberMenuContent = ({
  activeTeamId,
  canChangeToAdmin,
  canChangeToMember,
  canRemoveMember,
  canViewLogs,
  memberId,
  memberRole,
  onOpenMemberLogs,
  onOpenMemberLogsAfterDemotion,
}: {
  activeTeamId?: string;
  canChangeToAdmin: boolean;
  canChangeToMember: boolean;
  canRemoveMember: boolean;
  canViewLogs: boolean;
  memberId: string;
  memberRole: string;
  onOpenMemberLogs: (memberId: string) => void;
  onOpenMemberLogsAfterDemotion: (memberId: string) => void;
}) => {
  const colorScheme = useColorScheme();
  const sheetManager = useSheetManager();
  const { onOpenChange } = Menu.useContext();

  const [loadingRole, setLoadingRole] = React.useState<AssignableRole | null>(
    null
  );

  const handleRolePress = React.useCallback(
    async (nextRole: AssignableRole) => {
      if (loadingRole === nextRole) return;

      if (memberRole === nextRole) {
        if (nextRole === Role.Member) {
          onOpenChange(false);
          onOpenMemberLogs(memberId);
        }

        return;
      }

      if (!activeTeamId) return;
      setLoadingRole(nextRole);

      try {
        await updateRole({
          roleId: memberId,
          role: nextRole,
          teamId: activeTeamId,
        });

        if (nextRole === Role.Member) {
          onOpenChange(false);
          onOpenMemberLogsAfterDemotion(memberId);
        }
      } finally {
        setLoadingRole(null);
      }
    },
    [
      activeTeamId,
      loadingRole,
      memberId,
      memberRole,
      onOpenChange,
      onOpenMemberLogs,
      onOpenMemberLogsAfterDemotion,
    ]
  );

  return (
    <>
      {ASSIGNABLE_ROLES.map((role) => {
        const isDisabled =
          (role === Role.Admin && !canChangeToAdmin) ||
          (role === Role.Member && !canChangeToMember);

        return (
          <Menu.Item
            key={role}
            closeOnPress={false}
            disabled={isDisabled || !!loadingRole}
            onPress={() => handleRolePress(role)}
          >
            <View className="size-5 items-center justify-center">
              {loadingRole === role ? (
                <ActivityIndicator
                  color={UI[colorScheme].mutedForeground}
                  size={16}
                />
              ) : (
                memberRole === role && <Icon className="-mr-1" icon={Check} />
              )}
            </View>
            <Text className={loadingRole === role ? 'text-placeholder' : ''}>
              {ROLE_LABELS[role]}
            </Text>
          </Menu.Item>
        );
      })}
      {canViewLogs && (
        <>
          <Menu.Separator />
          <Menu.Item
            className={loadingRole ? 'opacity-50' : ''}
            disabled={!!loadingRole}
            onPress={() => onOpenMemberLogs(memberId)}
          >
            <Icon icon={SquaresFour} />
            <Text>Logs</Text>
          </Menu.Item>
        </>
      )}
      <Menu.Separator />
      <Menu.Item
        className={!canRemoveMember || loadingRole ? 'opacity-50' : ''}
        disabled={!canRemoveMember || !!loadingRole}
        onPress={() => sheetManager.open('member-remove', memberId)}
      >
        <Icon className="text-destructive" icon={UserMinus} />
        <Text className="text-destructive">Remove</Text>
      </Menu.Item>
    </>
  );
};
