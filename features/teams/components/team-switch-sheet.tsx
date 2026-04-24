import { createTeam } from '@/features/teams/mutations/create-team';
import { switchTeam } from '@/features/teams/mutations/switch-team';
import { useTeams } from '@/features/teams/queries/use-teams';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { useUi } from '@/queries/use-ui';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { Sheet } from '@/ui/sheet';
import { Text } from '@/ui/text';
import { Check, Plus } from 'phosphor-react-native';
import { View } from 'react-native';

export const TeamSwitchSheet = () => {
  const sheetManager = useSheetManager();
  const ui = useUi();
  const { teams } = useTeams();

  return (
    <Sheet
      onDismiss={() => sheetManager.close('team-switch')}
      open={sheetManager.isOpen('team-switch')}
      portalName="team-switch"
    >
      <View className="mx-auto max-w-md w-full p-8">
        <Text className="text-2xl text-center">Switch team</Text>
        <View className="mt-8">
          {teams.map((t) => (
            <Button
              key={t.id}
              className="rounded-none justify-between"
              variant="ghost"
              wrapperClassName="rounded-none"
              onPress={() => {
                switchTeam({ teamId: t.id, uiId: ui.id });
                sheetManager.close('team-switch');
              }}
            >
              <Text className="font-normal">{t.name}</Text>
              {t.id === ui.activeTeamId && (
                <Icon className="-mr-1 text-placeholder" icon={Check} />
              )}
            </Button>
          ))}
        </View>
        <Button
          variant="secondary"
          wrapperClassName="mt-8"
          onPress={() => {
            createTeam({ name: 'Team' });
            sheetManager.close('team-switch');
          }}
        >
          <Icon className="text-placeholder" icon={Plus} />
          <Text>New team</Text>
        </Button>
        <Button
          onPress={() => sheetManager.close('team-switch')}
          variant="secondary"
          wrapperClassName="mt-3"
        >
          <Text>Cancel</Text>
        </Button>
      </View>
    </Sheet>
  );
};
