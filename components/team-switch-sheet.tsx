import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Sheet } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { useSheetManager } from '@/context/sheet-manager';
import { createTeam } from '@/mutations/create-team';
import { switchTeam } from '@/mutations/switch-team';
import { useTeams } from '@/queries/use-teams';
import { useUi } from '@/queries/use-ui';
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
      <View className="mx-auto w-full max-w-md p-8">
        <Text className="text-center text-2xl">Switch team</Text>
        <View className="mt-8">
          {teams.map((t) => (
            <Button
              className="justify-between rounded-none"
              key={t.id}
              onPress={() => {
                switchTeam({ teamId: t.id, uiId: ui.id });
                sheetManager.close('team-switch');
              }}
              variant="ghost"
              wrapperClassName="rounded-none"
            >
              <Text className="font-normal">{t.name}</Text>
              {t.id === ui.activeTeamId && (
                <Icon className="-mr-1 text-placeholder" icon={Check} />
              )}
            </Button>
          ))}
        </View>
        <Button
          onPress={() => {
            createTeam({ name: 'Team' });
            sheetManager.close('team-switch');
          }}
          variant="secondary"
          wrapperClassName="mt-8"
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
