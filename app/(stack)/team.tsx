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
import { deleteTeamImage } from '@/mutations/delete-team-image';
import { updateRole } from '@/mutations/update-role';
import { updateTeam } from '@/mutations/update-team';
import { uploadTeamImage } from '@/mutations/upload-team-image';
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
import { launchImageLibraryAsync } from 'expo-image-picker';
import {
  Check,
  Copy,
  DotsThreeVertical,
  LinkBreak,
  QrCode,
  SignOut,
  SquaresFour,
  Trash,
  UploadSimple,
  UserMinus,
} from 'phosphor-react-native';
import { type ComponentRef, useCallback, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';

const ROLE_LABELS: Record<string, string> = {
  [Role.Owner]: 'Owner',
  [Role.Admin]: 'Admin',
  [Role.Member]: 'Member',
};

export default function Team() {
  const [copiedRole, setCopiedRole] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const nameInputRef = useRef<ComponentRef<typeof Input>>(null);
  const auth = db.useAuth();
  const colorScheme = useColorScheme();
  const sheetManager = useSheetManager();
  const team = useTeam();
  const { activeTeamId } = useUi();
  const { canManage, isAdmin, isOwner } = useMyRole();
  const { copy } = useCopy();
  const { inviteLinks } = useTeamInviteLinks();
  const logs = useLogs();
  const { members } = useTeamMembers();
  useTeams();

  const ownerCount = members.filter((m) => m.role === Role.Owner).length;

  const handleUploadTeamImage = useCallback(async () => {
    if (!activeTeamId) return;

    const picker = await launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      exif: false,
    });

    if (picker.canceled) return;
    await uploadTeamImage(picker.assets[0], activeTeamId);
  }, [activeTeamId]);

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
              {canManage ? (
                <Menu.Root>
                  <Menu.Trigger asChild>
                    <Button
                      className="items-end justify-between rounded-none border-b border-border px-0 pb-3 pt-3"
                      variant="link"
                    >
                      <Label className="shrink-0 p-0">Avatar</Label>
                      <Avatar avatar={team.image?.uri} id={team.id} size={34} />
                    </Button>
                  </Menu.Trigger>
                  <Menu.Content align="end">
                    <Menu.Item onPress={handleUploadTeamImage}>
                      <Icon className="text-placeholder" icon={UploadSimple} />
                      <Text>Upload</Text>
                    </Menu.Item>
                    {team.image && (
                      <>
                        <Menu.Separator />
                        <Menu.Item
                          onPress={() => deleteTeamImage(activeTeamId)}
                        >
                          <Icon className="text-destructive" icon={Trash} />
                          <Text className="text-destructive">Remove</Text>
                        </Menu.Item>
                      </>
                    )}
                  </Menu.Content>
                </Menu.Root>
              ) : (
                <View className="flex-row items-end justify-between border-b border-border pb-3 pt-3">
                  <Label className="shrink-0 p-0">Avatar</Label>
                  <Avatar avatar={team.image?.uri} id={team.id} size={34} />
                </View>
              )}
            </View>
            <View className="px-4">
              <View className="flex-row items-center justify-between border-b border-border">
                <Label
                  className="shrink-0 p-0"
                  onPress={() => nameInputRef.current?.focus()}
                >
                  Name
                </Label>
                <Input
                  editable={canManage}
                  maxLength={32}
                  className="min-w-0 shrink rounded-none border-0 bg-transparent pr-0 text-right"
                  onChangeText={(name) => updateTeam({ id: team.id, name })}
                  ref={nameInputRef}
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
              className="max-h-60 px-4"
              contentContainerClassName="py-2"
            >
              {members.map((member) => {
                const profile = member.user?.profile;
                const isSelf = member.userId === auth.user?.id;

                const isLastOwner =
                  member.role === Role.Owner && ownerCount <= 1;

                const canShowMemberMenu =
                  canManage &&
                  !isSelf &&
                  (isOwner || member.role !== Role.Owner);

                const canChangeToAdmin =
                  isOwner || (isAdmin && member.role === Role.Member);

                const canChangeToMember =
                  isOwner ||
                  (isAdmin &&
                    (member.role === Role.Admin ||
                      member.role === Role.Member));

                const canViewLogs = member.role === Role.Member;

                const canRemoveMember =
                  isOwner || (isAdmin && member.role !== Role.Owner);

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
                    {canShowMemberMenu && (
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
                          {[Role.Admin, Role.Member].map((r) => {
                            const isDisabled =
                              (r === Role.Admin && !canChangeToAdmin) ||
                              (r === Role.Member && !canChangeToMember);

                            return (
                              <Menu.Item
                                className="justify-between"
                                disabled={isDisabled}
                                key={r}
                                onPress={() => {
                                  if (member.role !== r) {
                                    updateRole({
                                      id: member.id,
                                      role: r,
                                      teamId: activeTeamId!,
                                      userId: member.userId,
                                    });
                                  }

                                  if (r === Role.Member) {
                                    sheetManager.open(
                                      'member-logs',
                                      profile?.id
                                    );
                                  }
                                }}
                              >
                                <Text className="flex-1">{ROLE_LABELS[r]}</Text>
                                {member.role === r && (
                                  <Icon className="-mr-1" icon={Check} />
                                )}
                              </Menu.Item>
                            );
                          })}
                          {canViewLogs && (
                            <>
                              <Menu.Separator />
                              <Menu.Item
                                onPress={() =>
                                  sheetManager.open('member-logs', profile?.id)
                                }
                              >
                                <Icon icon={SquaresFour} />
                                <Text>Logs</Text>
                              </Menu.Item>
                            </>
                          )}
                          <Menu.Separator />
                          <Menu.Item
                            className={canRemoveMember ? '' : 'opacity-50'}
                            disabled={!canRemoveMember}
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
                            <Text className="text-destructive">Leave</Text>
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
