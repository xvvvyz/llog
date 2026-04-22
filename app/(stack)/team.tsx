import { getInviteUrl } from '@/features/invites/lib/invite-url';
import { createInviteLink } from '@/features/invites/mutations/create-invite-link';
import { useTeamInvites } from '@/features/invites/queries/use-team-invite-links';
import { useLogs } from '@/features/logs/queries/use-logs';
import { TeamMemberMenuContent } from '@/features/teams/components/team-member-menu-content';
import { TeamSwitcher } from '@/features/teams/components/team-switcher';
import * as permissions from '@/features/teams/lib/permissions';
import { deleteTeamImage } from '@/features/teams/mutations/delete-team-image';
import { updateTeam } from '@/features/teams/mutations/update-team';
import { uploadTeamImage } from '@/features/teams/mutations/upload-team-image';
import { useMyRole } from '@/features/teams/queries/use-my-role';
import { useTeam } from '@/features/teams/queries/use-team';
import { useTeamMembers } from '@/features/teams/queries/use-team-members';
import { useTeams } from '@/features/teams/queries/use-teams';
import { Role } from '@/features/teams/types/role';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCopy } from '@/hooks/use-copy';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { db } from '@/lib/db';
import { useUi } from '@/queries/use-ui';
import { UI } from '@/theme/ui';
import { Avatar } from '@/ui/avatar';
import { BackButton } from '@/ui/back-button';
import { Button } from '@/ui/button';
import { Card } from '@/ui/card';
import * as Menu from '@/ui/dropdown-menu';
import { Header } from '@/ui/header';
import { Icon } from '@/ui/icon';
import { Input } from '@/ui/input';
import { Label } from '@/ui/label';
import { Loading } from '@/ui/loading';
import { Page } from '@/ui/page';
import { Text } from '@/ui/text';
import { launchImageLibraryAsync } from 'expo-image-picker';
import { Check } from 'phosphor-react-native/lib/module/icons/Check';
import { Copy } from 'phosphor-react-native/lib/module/icons/Copy';
import { DotsThreeVertical } from 'phosphor-react-native/lib/module/icons/DotsThreeVertical';
import { LinkBreak } from 'phosphor-react-native/lib/module/icons/LinkBreak';
import { QrCode } from 'phosphor-react-native/lib/module/icons/QrCode';
import { SignOut } from 'phosphor-react-native/lib/module/icons/SignOut';
import { Trash } from 'phosphor-react-native/lib/module/icons/Trash';
import { UploadSimple } from 'phosphor-react-native/lib/module/icons/UploadSimple';
import * as React from 'react';
import { ActivityIndicator, Keyboard, Pressable, View } from 'react-native';

const ROLE_LABELS: Record<string, string> = {
  [Role.Owner]: 'Owner',
  [Role.Admin]: 'Admin',
  [Role.Member]: 'Member',
};

export default function Team() {
  const [copiedRole, setCopiedRole] = React.useState<string | null>(null);
  const [loadingAction, setLoadingAction] = React.useState<string | null>(null);

  const [pendingMemberLogsRoleId, setPendingMemberLogsRoleId] = React.useState<
    string | null
  >(null);

  const nameInputRef = React.useRef<React.ComponentRef<typeof Input>>(null);
  const auth = db.useAuth();
  const colorScheme = useColorScheme();
  const sheetManager = useSheetManager();
  const team = useTeam();
  const { activeTeamId } = useUi();
  const myRole = useMyRole();
  const { canDeleteTeam, canManage } = myRole;
  const { copy } = useCopy();
  const { invites } = useTeamInvites();
  const logs = useLogs();
  const { members } = useTeamMembers();
  useTeams();

  const ownerCount = members.filter((m) => m.role === Role.Owner).length;

  const activeTeamLogIds = React.useMemo(
    () => new Set(logs.data.map((log) => log.id)),
    [logs.data]
  );

  React.useEffect(() => {
    if (!pendingMemberLogsRoleId) return;
    const member = members.find((m) => m.id === pendingMemberLogsRoleId);
    if (!member || member.role !== Role.Member) return;

    const hasActiveTeamLogs =
      member.user?.profile?.logs?.some((log) => activeTeamLogIds.has(log.id)) ??
      false;

    if (hasActiveTeamLogs) return;
    sheetManager.open('member-logs', pendingMemberLogsRoleId);
    setPendingMemberLogsRoleId(null);
  }, [activeTeamLogIds, members, pendingMemberLogsRoleId, sheetManager]);

  const handleOpenMemberLogs = React.useCallback(
    (memberId: string) => {
      setPendingMemberLogsRoleId(null);
      sheetManager.open('member-logs', memberId);
    },
    [sheetManager]
  );

  const handleOpenMemberLogsAfterDemotion = React.useCallback(
    (memberId: string) => {
      setPendingMemberLogsRoleId(memberId);
    },
    []
  );

  const handleUploadTeamImage = React.useCallback(async () => {
    if (!activeTeamId) return;

    const picker = await launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      exif: false,
    });

    if (picker.canceled) return;
    await uploadTeamImage(picker.assets[0], activeTeamId);
  }, [activeTeamId]);

  const getOrCreateAdminLink = React.useCallback(async () => {
    const existing = invites.find((l) => l.role === Role.Admin);
    if (existing) return existing.token;
    if (!activeTeamId) return null;

    const { token } = await createInviteLink({
      teamId: activeTeamId,
      role: Role.Admin,
    });

    return token;
  }, [invites, activeTeamId]);

  const handleCopyLink = React.useCallback(
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

  const handleShowQr = React.useCallback(
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

  const handleDelete = React.useCallback(
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
      <View className="flex-1 items-center justify-center p-3">
        <Pressable className="absolute inset-0" onPress={Keyboard.dismiss} />
        <Card className="w-full max-w-xs overflow-hidden p-0">
          <View className="pb-2">
            <View className="px-4">
              {canManage ? (
                <Menu.Root>
                  <Menu.Trigger asChild>
                    <Button
                      className="border-border w-full items-end justify-between rounded-none border-b px-0 pt-3 pb-3"
                      variant="link"
                      wrapperClassName="w-full rounded-none"
                    >
                      <Text className="text-muted-foreground shrink-0 text-base leading-tight">
                        Avatar
                      </Text>
                      <Avatar
                        avatar={team.image?.uri}
                        fallback="gradient"
                        id={team.id}
                        size={36}
                      />
                    </Button>
                  </Menu.Trigger>
                  <Menu.Content align="end" className="my-0">
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
                <View className="border-border flex-row items-end justify-between border-b pt-3 pb-3">
                  <Label className="shrink-0 p-0">Avatar</Label>
                  <Avatar
                    avatar={team.image?.uri}
                    fallback="gradient"
                    id={team.id}
                    size={36}
                  />
                </View>
              )}
            </View>
            <View className="px-4">
              <Pressable
                className="border-border flex-row items-center justify-between border-b"
                disabled={!canManage}
                onPress={() => nameInputRef.current?.focus()}
              >
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
                  onChangeText={(name) => updateTeam({ id: team.id!, name })}
                  ref={nameInputRef}
                  selectTextOnFocus
                  value={team.name}
                />
              </Pressable>
            </View>
            {canManage &&
              [Role.Admin, Role.Member]
                .filter((role) => role === Role.Admin || logs.data.length > 0)
                .map((role) => (
                  <View key={role} className="px-4">
                    <View className="border-border flex-row items-center justify-between gap-4 border-b py-3">
                      <View className="flex-1">
                        <Text className="text-muted-foreground font-normal">
                          {ROLE_LABELS[role]} invite link
                        </Text>
                        <Text className="text-placeholder pb-0.5 text-xs">
                          {role === Role.Admin
                            ? 'Can manage team and logs'
                            : 'Can access selected logs'}
                        </Text>
                      </View>
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
                        {invites.some((l) => l.role === role) && (
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
                  </View>
                ))}
            <View className="max-h-60 px-4 py-2">
              {members.map((member) => {
                const profile = member.user?.profile;
                const isSelf = member.userId === auth.user?.id;

                const isLastOwner =
                  member.role === Role.Owner && ownerCount <= 1;

                const canShowMemberMenu = permissions.canOpenTeamMemberMenu({
                  actorRole: myRole.role,
                  isSelf,
                  targetRole: member.role,
                });

                const canChangeToAdmin = permissions.canChangeTeamMemberRole({
                  actorRole: myRole.role,
                  isSelf,
                  nextRole: Role.Admin,
                  targetRole: member.role,
                });

                const canChangeToMember = permissions.canChangeTeamMemberRole({
                  actorRole: myRole.role,
                  isSelf,
                  nextRole: Role.Member,
                  targetRole: member.role,
                });

                const canViewLogs = permissions.isMemberRole(member.role);

                const canRemoveMember = permissions.canRemoveTeamMember({
                  actorRole: myRole.role,
                  isSelf,
                  targetRole: member.role,
                });

                return (
                  <View
                    className="flex-row items-center justify-between py-2.5"
                    key={member.id}
                  >
                    <View className="flex-1 flex-row items-center gap-3">
                      <Avatar
                        avatar={profile?.image?.uri}
                        id={profile?.id}
                        seedId={profile?.avatarSeedId}
                        size={36}
                      />
                      <View className="flex-1">
                        <Text
                          className="text-sm leading-tight font-medium"
                          numberOfLines={1}
                        >
                          {profile?.name}
                        </Text>
                        <Text className="text-placeholder text-xs leading-tight">
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
                          <TeamMemberMenuContent
                            activeTeamId={activeTeamId}
                            canChangeToAdmin={canChangeToAdmin}
                            canChangeToMember={canChangeToMember}
                            canRemoveMember={canRemoveMember}
                            canViewLogs={canViewLogs}
                            memberId={member.id}
                            memberRole={member.role}
                            onOpenMemberLogs={handleOpenMemberLogs}
                            onOpenMemberLogsAfterDemotion={
                              handleOpenMemberLogsAfterDemotion
                            }
                          />
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
            </View>
            <View>
              {canDeleteTeam && (
                <>
                  <View className="border-border mb-2 border-t" />
                  <Button
                    className="justify-between rounded-none"
                    onPress={() => sheetManager.open('team-delete')}
                    variant="ghost"
                    wrapperClassName="rounded-none"
                  >
                    <Text className="text-destructive font-normal">
                      Delete team
                    </Text>
                    <Icon className="text-destructive -mr-0.5" icon={Trash} />
                  </Button>
                </>
              )}
            </View>
          </View>
        </Card>
      </View>
    </Page>
  );
}
