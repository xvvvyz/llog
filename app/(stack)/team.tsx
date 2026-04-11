import { TeamSwitcher } from '@/components/team-switcher';
import { Avatar } from '@/components/ui/avatar';
import { BackButton } from '@/components/ui/back-button';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import * as Menu from '@/components/ui/dropdown-menu';
import { Header } from '@/components/ui/header';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loading } from '@/components/ui/loading';
import { Page } from '@/components/ui/page';
import { Text } from '@/components/ui/text';
import { useSheetManager } from '@/context/sheet-manager';
import { Role } from '@/enums/roles';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCopy } from '@/hooks/use-copy';
import { createInviteLink } from '@/mutations/create-invite-link';
import { updateRole } from '@/mutations/update-role';
import { updateTeam } from '@/mutations/update-team';
import { useLogs } from '@/queries/use-logs';
import { useMyRole } from '@/queries/use-my-role';
import { useTeam } from '@/queries/use-team';
import { useTeamInviteLinks } from '@/queries/use-team-invite-links';
import { useTeamMembers } from '@/queries/use-team-members';
import { useTeams } from '@/queries/use-teams';
import { useUi } from '@/queries/use-ui';
import { UI } from '@/theme/ui';
import { db } from '@/utilities/db';
import { getInviteUrl } from '@/utilities/invite-url';
import {
  Check,
  Copy,
  DotsThreeVertical,
  LinkBreak,
  QrCode,
  SignOut,
  SquaresFour,
  Trash,
  UserMinus,
} from 'phosphor-react-native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';

const ROLE_LABELS: Record<string, string> = {
  [Role.Owner]: 'Owner',
  [Role.Admin]: 'Admin',
  [Role.Member]: 'Member',
};

export default function Team() {
  const [copiedRole, setCopiedRole] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const auth = db.useAuth();
  const colorScheme = useColorScheme();
  const sheetManager = useSheetManager();
  const team = useTeam();
  const { activeTeamId } = useUi();
  const { canManage, isOwner } = useMyRole();
  const { copy } = useCopy();
  const { inviteLinks } = useTeamInviteLinks();
  const logs = useLogs();
  const { members } = useTeamMembers();
  useTeams();

  const ownerCount = members.filter((m) => m.role === Role.Owner).length;

  const getOrCreateAdminLink = useCallback(async () => {
    const existing = inviteLinks.find((l) => l.role === Role.Admin);
    if (existing) return existing.token;
    if (!activeTeamId) return null;

    const { token } = await createInviteLink({
      teamId: activeTeamId,
      role: Role.Admin,
    });

    return token;
  }, [inviteLinks, activeTeamId]);

  const handleCopyLink = useCallback(
    async (role: string) => {
      if (role === Role.Member) {
        sheetManager.open('invite-logs', 'copy');
        return;
      }

      setLoadingAction(`copy-${role}`);

      try {
        const token = await getOrCreateAdminLink();

        if (token) {
          await copy(getInviteUrl(token));
          setCopiedRole(role);
          setTimeout(() => setCopiedRole(null), 2000);
        }
      } finally {
        setLoadingAction(null);
      }
    },
    [getOrCreateAdminLink, sheetManager, copy]
  );

  const handleShowQr = useCallback(
    async (role: string) => {
      if (role === Role.Member) {
        sheetManager.open('invite-logs', 'qr');
        return;
      }

      setLoadingAction(`qr-${role}`);

      try {
        const token = await getOrCreateAdminLink();
        if (token) sheetManager.open('invite-qr', getInviteUrl(token));
      } finally {
        setLoadingAction(null);
      }
    },
    [getOrCreateAdminLink, sheetManager]
  );

  const handleDelete = useCallback(
    (role: string) => {
      sheetManager.open('invite-delete', role);
    },
    [sheetManager]
  );

  if (team.isLoading) {
    return (
      <Page>
        <Header left={<BackButton />} title={<TeamSwitcher hideSettings />} />
        <Loading />
      </Page>
    );
  }

  return (
    <Page>
      <Header left={<BackButton />} title={<TeamSwitcher hideSettings />} />
      <ScrollView contentContainerClassName="items-center justify-center flex-1 p-3">
        <Card className="w-full max-w-xs overflow-hidden p-0">
          <View className="pb-2">
            <View className="px-4">
              <View className="flex-row items-center justify-between border-b border-border pt-2">
                <Label className="shrink-0 p-0">Team name</Label>
                <Input
                  editable={canManage}
                  maxLength={32}
                  className="min-w-0 shrink rounded-none border-0 bg-transparent pr-0 text-right"
                  onChangeText={(name) => updateTeam({ id: team.id, name })}
                  value={team.name}
                />
              </View>
            </View>
            {canManage &&
              [Role.Admin, Role.Member]
                .filter((role) => role === Role.Admin || logs.data.length > 0)
                .map((role) => (
                  <View key={role} className="px-4">
                    <View className="flex-row items-center justify-between pt-1.5">
                      <Text className="font-normal text-muted-foreground">
                        {ROLE_LABELS[role]} invite link
                      </Text>
                      <View className="-mr-[7px] flex-row items-center gap-1">
                        <Button
                          className="size-8"
                          onPress={() => handleCopyLink(role)}
                          size="icon"
                          variant="ghost"
                        >
                          {loadingAction === `copy-${role}` ? (
                            <ActivityIndicator
                              size={16}
                              color={UI[colorScheme].mutedForeground}
                            />
                          ) : (
                            <Icon
                              className="text-placeholder"
                              icon={copiedRole === role ? Check : Copy}
                            />
                          )}
                        </Button>
                        <Button
                          className="size-8"
                          onPress={() => handleShowQr(role)}
                          size="icon"
                          variant="ghost"
                        >
                          {loadingAction === `qr-${role}` ? (
                            <ActivityIndicator
                              size={16}
                              color={UI[colorScheme].mutedForeground}
                            />
                          ) : (
                            <Icon className="text-placeholder" icon={QrCode} />
                          )}
                        </Button>
                        {inviteLinks.some((l) => l.role === role) && (
                          <Button
                            className="size-8"
                            onPress={() => handleDelete(role)}
                            size="icon"
                            variant="ghost"
                          >
                            <Icon
                              className="text-placeholder"
                              icon={LinkBreak}
                            />
                          </Button>
                        )}
                      </View>
                    </View>
                    <Text className="-mt-1 pb-3 text-xs text-placeholder">
                      {role === Role.Admin
                        ? 'Can manage team and logs'
                        : 'Can access selected logs'}
                    </Text>
                    <View className="border-b border-border" />
                  </View>
                ))}
            <ScrollView
              className="max-h-72 px-4"
              contentContainerClassName="py-2"
            >
              {members.map((member) => {
                const profile = member.user?.profile;
                const isSelf = member.userId === auth.user?.id;

                const isLastOwner =
                  member.role === Role.Owner && ownerCount <= 1;

                return (
                  <View
                    className="flex-row items-center justify-between py-2.5"
                    key={member.id}
                  >
                    <View className="flex-1 flex-row items-center gap-3">
                      <Avatar
                        avatar={profile?.image?.uri}
                        id={profile?.id}
                        size={34}
                      />
                      <View className="flex-1">
                        <Text className="text-sm font-medium" numberOfLines={1}>
                          {profile?.name}
                        </Text>
                        <Text className="text-xs text-placeholder">
                          {ROLE_LABELS[member.role] ?? member.role}
                        </Text>
                      </View>
                    </View>
                    {canManage &&
                      !isSelf &&
                      (isOwner || member.role === Role.Member) && (
                        <Menu.Root>
                          <Menu.Trigger asChild>
                            <Button
                              className="size-8"
                              variant="ghost"
                              size="icon"
                              wrapperClassName="-mr-[7px]"
                            >
                              <Icon
                                className="text-placeholder"
                                icon={DotsThreeVertical}
                              />
                            </Button>
                          </Menu.Trigger>
                          <Menu.Content align="end">
                            {isOwner &&
                              [Role.Admin, Role.Member].map((r) => (
                                <Menu.Item
                                  className="justify-between"
                                  key={r}
                                  onPress={() => {
                                    updateRole({
                                      id: member.id,
                                      role: r,
                                      teamId: activeTeamId!,
                                      userId: member.userId,
                                    });

                                    if (r === Role.Member) {
                                      sheetManager.open(
                                        'member-logs',
                                        profile?.id
                                      );
                                    }
                                  }}
                                >
                                  <Text className="flex-1">
                                    {ROLE_LABELS[r]}
                                  </Text>
                                  {member.role === r && (
                                    <Icon className="-mr-1" icon={Check} />
                                  )}
                                </Menu.Item>
                              ))}
                            {member.role === Role.Member && (
                              <>
                                {isOwner && <Menu.Separator />}
                                <Menu.Item
                                  onPress={() =>
                                    sheetManager.open(
                                      'member-logs',
                                      profile?.id
                                    )
                                  }
                                >
                                  <Icon icon={SquaresFour} />
                                  <Text>Access</Text>
                                </Menu.Item>
                              </>
                            )}
                            <Menu.Separator />
                            <Menu.Item
                              onPress={() =>
                                sheetManager.open('member-remove', member.id)
                              }
                            >
                              <Icon
                                className="text-destructive"
                                icon={UserMinus}
                              />
                              <Text className="text-destructive">Remove</Text>
                            </Menu.Item>
                          </Menu.Content>
                        </Menu.Root>
                      )}
                    {isSelf && !isLastOwner && (
                      <Menu.Root>
                        <Menu.Trigger asChild>
                          <Button
                            className="size-8"
                            variant="ghost"
                            size="icon"
                            wrapperClassName="-mr-[7px]"
                          >
                            <Icon
                              className="text-placeholder"
                              icon={DotsThreeVertical}
                            />
                          </Button>
                        </Menu.Trigger>
                        <Menu.Content align="end">
                          <Menu.Item
                            onPress={() => sheetManager.open('team-leave')}
                          >
                            <Icon className="text-destructive" icon={SignOut} />
                            <Text className="text-destructive">Leave team</Text>
                          </Menu.Item>
                        </Menu.Content>
                      </Menu.Root>
                    )}
                  </View>
                );
              })}
            </ScrollView>
            <View>
              {isOwner && (
                <>
                  <View className="mb-2 border-t border-border" />
                  <Button
                    className="justify-between rounded-none"
                    onPress={() => sheetManager.open('team-delete')}
                    variant="ghost"
                    wrapperClassName="rounded-none"
                  >
                    <Text className="font-normal text-destructive">
                      Delete team
                    </Text>
                    <Icon className="-mr-0.5 text-destructive" icon={Trash} />
                  </Button>
                </>
              )}
            </View>
          </View>
        </Card>
      </ScrollView>
    </Page>
  );
}
