import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { deleteTeam } from '@/mutations/delete-team';
import { switchTeam } from '@/mutations/switch-team';
import { useTeam } from '@/queries/use-team';
import { useTeams } from '@/queries/use-teams';
import { useUi } from '@/queries/use-ui';
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
      <View className="mx-auto w-full max-w-md p-8">
        <Text className="text-center text-2xl">Delete team?</Text>
        <Button
          onPress={async () => {
            const nextTeam = teams.find((t) => t.id !== team.id);
            sheetManager.close('team-delete');

            if (nextTeam) {
              await switchTeam({ teamId: nextTeam.id, uiId: ui.id });
            }

            await deleteTeam({ id: team.id! });
            router.replace('/');
          }}
          variant="destructive"
          wrapperClassName="mt-12"
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
