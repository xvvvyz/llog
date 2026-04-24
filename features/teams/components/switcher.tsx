import { createTeam } from '@/features/teams/mutations/create';
import { switchTeam } from '@/features/teams/mutations/switch';
import { useTeams } from '@/features/teams/queries/use-teams';
import { useBreakpoints } from '@/hooks/use-breakpoints';
import { cn } from '@/lib/cn';
import { useUi } from '@/queries/use-ui';
import { Avatar } from '@/ui/avatar';
import { Button } from '@/ui/button';
import * as Menu from '@/ui/dropdown-menu';
import { Icon } from '@/ui/icon';
import { Text } from '@/ui/text';
import { router } from 'expo-router';
import { CaretDown, Check, GearSix, Plus } from 'phosphor-react-native';
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
        <Button className="h-auto py-3 gap-1 md:self-start" variant="link">
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
            key={t.id}
            className="justify-between"
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
