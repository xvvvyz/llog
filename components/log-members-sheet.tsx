import { Avatar } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { Sheet } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { useSheetManager } from '@/context/sheet-manager';
import { Role } from '@/enums/roles';
import { useLogColor } from '@/hooks/use-log-color';
import { toggleLogMember } from '@/mutations/toggle-log-member';
import { useLog } from '@/queries/use-log';
import { useTeamMembers } from '@/queries/use-team-members';
import { ScrollView, View } from 'react-native';

export const LogMembersSheet = () => {
  const sheetManager = useSheetManager();
  const log = useLog({ id: sheetManager.getId('log-members') });
  const logColor = useLogColor({ id: log.id });
  const { members, isLoading: membersLoading } = useTeamMembers();
  const isLoading = log.isLoading || membersLoading;

  return (
    <Sheet
      loading={isLoading}
      onDismiss={() => sheetManager.close('log-members')}
      open={sheetManager.isOpen('log-members')}
      portalName="log-members"
    >
      <ScrollView
        contentContainerClassName="w-full p-8 sm:mx-auto sm:max-w-sm"
        keyboardShouldPersistTaps="always"
      >
        {members
          .filter(
            (member) => member.role !== Role.Owner && member.role !== Role.Admin
          )
          .map((member) => {
            const profile = member.user?.profile;
            if (!profile) return null;
            const isSelected = log.profileIdsSet.has(profile.id);

            return (
              <View
                className="flex-row items-center justify-between py-2.5"
                key={member.id}
              >
                <View className="flex-row items-center gap-3">
                  <Avatar
                    avatar={profile.image?.uri}
                    id={profile.id}
                    size={28}
                  />
                  <Text numberOfLines={1}>{profile.name}</Text>
                </View>
                <Checkbox
                  checked={isSelected}
                  checkedColor={logColor.default}
                  className="size-8 border-0"
                  onCheckedChange={() =>
                    toggleLogMember({
                      profileId: profile.id,
                      isSelected,
                      logId: log.id,
                    })
                  }
                />
              </View>
            );
          })}
      </ScrollView>
    </Sheet>
  );
};
