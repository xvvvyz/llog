import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { useSheetManager } from '@/context/sheet-manager';
import { leaveTeam } from '@/mutations/leave-team';
import { useMyRole } from '@/queries/use-my-role';
import { useTeam } from '@/queries/use-team';
import { useTeams } from '@/queries/use-teams';
import { useUi } from '@/queries/use-ui';
import { router } from 'expo-router';
import { View } from 'react-native';

export const TeamLeaveSheet = () => {
  const sheetManager = useSheetManager();
  const team = useTeam();
  const { teams } = useTeams();
  const ui = useUi();
  const myRole = useMyRole();

  return (
    <Sheet
      onDismiss={() => sheetManager.close('team-leave')}
      open={sheetManager.isOpen('team-leave')}
      portalName="team-leave"
    >
      <View className="mx-auto w-full max-w-md p-8">
        <Text className="text-center text-2xl">
          Leave &quot;{team.name}&quot;?
        </Text>
        <Button
          onPress={async () => {
            sheetManager.close('team-leave');
            if (!myRole.id || teams.length <= 1) return;

            await leaveTeam({
              roleId: myRole.id,
              teams,
              activeTeamId: ui.activeTeamId,
              uiId: ui.id,
            });

            router.replace('/');
          }}
          variant="destructive"
          wrapperClassName="mt-12"
        >
          <Text>Leave</Text>
        </Button>
        <Button
          onPress={() => sheetManager.close('team-leave')}
          variant="secondary"
          wrapperClassName="mt-3"
        >
          <Text>Cancel</Text>
        </Button>
      </View>
    </Sheet>
  );
};
