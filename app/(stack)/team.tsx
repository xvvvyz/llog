import { getInviteUrl } from '@/features/invites/lib/url';
import { createInviteLink } from '@/features/invites/mutations/create-link';
import { useTeamInvites } from '@/features/invites/queries/use-team-links';
import { useLogs } from '@/features/logs/queries/use-logs';
import { TeamMemberMenuContent } from '@/features/teams/components/member-menu-content';
import { TeamSwitcher } from '@/features/teams/components/switcher';
import * as permissions from '@/features/teams/lib/permissions';
import { deleteTeamImage } from '@/features/teams/mutations/delete-image';
import { updateTeam } from '@/features/teams/mutations/update';
import { uploadTeamImage } from '@/features/teams/mutations/upload-image';
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
import * as React from 'react';
import { ActivityIndicator, Keyboard, Pressable, View } from 'react-native';

import {
  Check,
  Copy,
  DotsThreeVertical,
  LinkBreak,
  QrCode,
  SignOut,
  Trash,
  UploadSimple,
} from 'phosphor-react-native';

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

  const getOrCreateAdminInviteUrl = React.useCallback(async () => {
    const token = await getOrCreateAdminLink();
    if (!token) throw new Error('Failed to create invite link');
    return getInviteUrl(token);
  }, [getOrCreateAdminLink]);

  const handleCopyLink = React.useCallback(
    async (role: string) => {
      if (role === Role.Member) {
        sheetManager.open('invite-logs', 'copy');
        return;
      }

      setLoadingAction(`copy-${role}`);

      try {
        await copy(getOrCreateAdminInviteUrl);
        setCopiedRole(role);
        setTimeout(() => setCopiedRole(null), 2000);
      } finally {
        setLoadingAction(null);
      }
    },
    [copy, getOrCreateAdminInviteUrl, sheetManager]
  );

  const handleShowQr = React.useCallback(
    async (role: string) => {
      if (role === Role.Member) {
        sheetManager.open('invite-logs', 'qr');
        return;
      }

      setLoadingAction(`qr-${role}`);

      try {
        sheetManager.open('invite-qr', await getOrCreateAdminInviteUrl());
      } finally {
        setLoadingAction(null);
      }
    },
    [getOrCreateAdminInviteUrl, sheetManager]
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
      <View className="flex-1 p-3 items-center justify-center">
        <Pressable className="absolute inset-0" onPress={Keyboard.dismiss} />
        <Card className="overflow-hidden max-w-xs w-full p-0">
          <View className="pb-2">
            <View className="px-4">
              {canManage ? (
                <Menu.Root>
                  <Menu.Trigger asChild>
                    <Button
                      className="w-full pb-3 pt-3 px-0 border-b border-border rounded-none items-end justify-between"
                      variant="link"
                      wrapperClassName="w-full rounded-none"
                    >
                      <Text className="leading-tight text-base text-muted-foreground shrink-0">
                        Avatar
                      </Text>
                      <Avatar
                        avatar={team.image?.uri}
                        fallback="gradient"
                        id={team.id}
                        size={42}
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
                <View className="flex-row pb-3 pt-3 border-b border-border items-end justify-between">
                  <Label className="p-0 shrink-0">Avatar</Label>
                  <Avatar
                    avatar={team.image?.uri}
                    fallback="gradient"
                    id={team.id}
                    size={42}
                  />
                </View>
              )}
            </View>
            <View className="px-4">
              <Pressable
                className="flex-row border-b border-border items-center justify-between"
                disabled={!canManage}
                onPress={() => nameInputRef.current?.focus()}
              >
                <Label
                  className="p-0 shrink-0"
                  onPress={() => nameInputRef.current?.focus()}
                >
                  Name
                </Label>
                <Input
                  ref={nameInputRef}
                  className="min-w-0 pr-0 border-0 rounded-none bg-transparent text-right shrink"
                  editable={canManage}
                  maxLength={32}
                  onChangeText={(name) => updateTeam({ id: team.id!, name })}
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
                    <View className="flex-row py-3 border-b border-border gap-4 items-center justify-between">
                      <View className="flex-1">
                        <Text className="font-normal text-muted-foreground">
                          {ROLE_LABELS[role]} invite link
                        </Text>
                        <Text className="pb-0.5 text-placeholder text-xs">
                          {role === Role.Admin
                            ? 'Can manage team and logs'
                            : 'Can access selected logs'}
                        </Text>
                      </View>
                      <View className="flex-row -mr-[7px] gap-1 items-center">
                        <Button
                          className="size-8"
                          onPress={() => handleCopyLink(role)}
                          size="icon"
                          variant="ghost"
                        >
                          {loadingAction === `copy-${role}` ? (
                            <ActivityIndicator
                              color={UI[colorScheme].mutedForeground}
                              size={16}
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
                              color={UI[colorScheme].mutedForeground}
                              size={16}
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
                    key={member.id}
                    className="flex-row py-2.5 items-center justify-between"
                  >
                    <View className="flex-1 flex-row gap-3 items-center">
                      <Avatar
                        avatar={profile?.image?.uri}
                        id={profile?.id}
                        seedId={profile?.avatarSeedId}
                        size={32}
                      />
                      <View className="flex-1">
                        <Text
                          className="font-medium leading-tight text-sm"
                          numberOfLines={1}
                        >
                          {profile?.name}
                        </Text>
                        <Text className="leading-tight text-placeholder text-xs">
                          {ROLE_LABELS[member.role] ?? member.role}
                        </Text>
                      </View>
                    </View>
                    {canShowMemberMenu && (
                      <Menu.Root>
                        <Menu.Trigger asChild>
                          <Button
                            className="size-8"
                            size="icon"
                            variant="ghost"
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
                            size="icon"
                            variant="ghost"
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
                  <View className="mb-2 border-border border-t" />
                  <Button
                    className="rounded-none justify-between"
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
      </View>
    </Page>
  );
}
