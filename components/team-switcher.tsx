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
import { cn } from '@/utilities/cn';
import { router } from 'expo-router';
import { CaretDown } from 'phosphor-react-native/lib/module/icons/CaretDown';
import { Check } from 'phosphor-react-native/lib/module/icons/Check';
import { GearSix } from 'phosphor-react-native/lib/module/icons/GearSix';
import { Plus } from 'phosphor-react-native/lib/module/icons/Plus';
import * as React from 'react';
import { View } from 'react-native';

export const TeamSwitcher = ({
  hideSettings,
}: { hideSettings?: boolean } = {}) => {
  const breakpoints = useBreakpoints();
  const ui = useUi();
  const { teams } = useTeams();
  const activeTeam = teams.find((t) => t.id === ui.activeTeamId);
  const lastAvatarRef = React.useRef(activeTeam?.image?.uri);
  const lastIdRef = React.useRef(activeTeam?.id);
  const lastNameRef = React.useRef(activeTeam?.name);
  if (activeTeam?.image?.uri) lastAvatarRef.current = activeTeam.image.uri;
  if (activeTeam?.id) lastIdRef.current = activeTeam.id;
  if (activeTeam?.name) lastNameRef.current = activeTeam.name;

  return (
    <Menu.Root>
      <Menu.Trigger asChild>
        <Button className="h-auto gap-1 py-3 md:self-start" variant="link">
          <Avatar
            avatar={activeTeam?.image?.uri ?? lastAvatarRef.current}
            className={cn('shrink-0', breakpoints.md ? 'mr-3' : 'mr-1')}
            fallback="gradient"
            id={activeTeam?.id ?? lastIdRef.current}
            size={breakpoints.md ? 20 : 16}
          />
          <Text className="web:md:text-xl">
            {activeTeam?.name ?? lastNameRef.current}
          </Text>
          <Icon className="text-placeholder" icon={CaretDown} />
        </Button>
      </Menu.Trigger>
      <Menu.Content align={breakpoints.md ? 'start' : 'center'}>
        {teams.map((t) => (
          <Menu.Item
            className="justify-between"
            key={t.id}
            onPress={() => switchTeam({ teamId: t.id, uiId: ui.id })}
          >
            <Avatar
              avatar={t.image?.uri}
              fallback="gradient"
              id={t.id}
              size={20}
            />
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
