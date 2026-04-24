import { deleteTeam } from '@/features/teams/mutations/delete-team';
import { switchTeam } from '@/features/teams/mutations/switch-team';
import { useTeam } from '@/features/teams/queries/use-team';
import { useTeams } from '@/features/teams/queries/use-teams';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { useUi } from '@/queries/use-ui';
import { Button } from '@/ui/button';
import { Sheet } from '@/ui/sheet';
import { Text } from '@/ui/text';
import { router } from 'expo-router';
import { View } from 'react-native';

export const TeamDeleteSheet = () => {
  const sheetManager = useSheetManager();
  const team = useTeam();
  const { teams } = useTeams();
  const ui = useUi();

  return (
    <Sheet
      onDismiss={() => sheetManager.close('team-delete')}
      open={sheetManager.isOpen('team-delete')}
      portalName="team-delete"
    >
      <View className="mx-auto max-w-md w-full p-8">
        <Text className="text-2xl text-center">Delete team?</Text>
        <Button
          variant="destructive"
          wrapperClassName="mt-12"
          onPress={async () => {
            const nextTeam = teams.find((t) => t.id !== team.id);
            sheetManager.close('team-delete');

            if (nextTeam) {
              await switchTeam({ teamId: nextTeam.id, uiId: ui.id });
            }

            await deleteTeam({ id: team.id! });
            router.replace('/');
          }}
        >
          <Text>Delete</Text>
        </Button>
        <Button
          onPress={() => sheetManager.close('team-delete')}
          variant="secondary"
          wrapperClassName="mt-3"
        >
          <Text>Cancel</Text>
        </Button>
      </View>
    </Sheet>
  );
};
