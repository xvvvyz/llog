import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import * as Menu from '@/components/ui/dropdown-menu';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useBreakpoints } from '@/hooks/use-breakpoints';
import { createTeam } from '@/mutations/create-team';
import { switchTeam } from '@/mutations/switch-team';
import { useTeams } from '@/queries/use-teams';
import { useUi } from '@/queries/use-ui';
import { router } from 'expo-router';
import { CaretDown, Check, GearSix, Plus } from 'phosphor-react-native';
import { useRef } from 'react';
import { View } from 'react-native';

export const TeamSwitcher = ({
  hideSettings,
}: { hideSettings?: boolean } = {}) => {
  const breakpoints = useBreakpoints();
  const ui = useUi();
  const { teams } = useTeams();
  const activeTeam = teams.find((t) => t.id === ui.activeTeamId);
  const lastNameRef = useRef(activeTeam?.name);
  if (activeTeam?.name) lastNameRef.current = activeTeam.name;

  return (
    <Menu.Root>
      <Menu.Trigger asChild>
        <Button className="h-auto gap-1 py-3 md:self-start" variant="link">
          <Text className="web:md:text-xl">
            {activeTeam?.name ?? lastNameRef.current}
          </Text>
          <Icon className="-mr-0.5 text-placeholder" icon={CaretDown} />
        </Button>
      </Menu.Trigger>
      <Menu.Content align={breakpoints.md ? 'start' : 'center'}>
        {teams.map((t) => (
          <Menu.Item
            className="justify-between"
            key={t.id}
            onPress={() => switchTeam({ teamId: t.id, uiId: ui.id })}
          >
            <Avatar id={t.id} size={20} />
            <Text className="flex-1">{t.name}</Text>
            {t.id === ui.activeTeamId && (
              <Icon className="-mr-1" icon={Check} />
            )}
          </Menu.Item>
        ))}
        <Menu.Item onPress={() => createTeam({ name: 'Team' })}>
          <View className="w-5 items-center">
            <Icon className="text-placeholder" icon={Plus} />
          </View>
          <Text>New team</Text>
        </Menu.Item>
        {!hideSettings && (
          <>
            <Menu.Separator />
            <Menu.Item onPress={() => router.push('/team')}>
              <View className="w-5 items-center">
                <Icon className="text-placeholder" icon={GearSix} />
              </View>
              <Text>Team settings</Text>
            </Menu.Item>
          </>
        )}
      </Menu.Content>
    </Menu.Root>
  );
};
