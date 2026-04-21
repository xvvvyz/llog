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
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCopy } from '@/hooks/use-copy';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { createInviteLink } from '@/mutations/create-invite-link';
import { deleteTeamImage } from '@/mutations/delete-team-image';
import { updateRole } from '@/mutations/update-role';
import { updateTeam } from '@/mutations/update-team';
import { uploadTeamImage } from '@/mutations/upload-team-image';
import { useLogs } from '@/queries/use-logs';
import { useMyRole } from '@/queries/use-my-role';
import { useTeam } from '@/queries/use-team';
import { useTeamInvites } from '@/queries/use-team-invite-links';
import { useTeamMembers } from '@/queries/use-team-members';
import { useTeams } from '@/queries/use-teams';
import { useUi } from '@/queries/use-ui';
import { UI } from '@/theme/ui';
import { Role } from '@/types/role';
import { db } from '@/utilities/db';
import { getInviteUrl } from '@/utilities/invite-url';
import * as p from '@/utilities/permissions';
import { launchImageLibraryAsync } from 'expo-image-picker';
import { Check } from 'phosphor-react-native/lib/module/icons/Check';
import { Copy } from 'phosphor-react-native/lib/module/icons/Copy';
import { DotsThreeVertical } from 'phosphor-react-native/lib/module/icons/DotsThreeVertical';
import { LinkBreak } from 'phosphor-react-native/lib/module/icons/LinkBreak';
import { QrCode } from 'phosphor-react-native/lib/module/icons/QrCode';
import { SignOut } from 'phosphor-react-native/lib/module/icons/SignOut';
import { SquaresFour } from 'phosphor-react-native/lib/module/icons/SquaresFour';
import { Trash } from 'phosphor-react-native/lib/module/icons/Trash';
import { UploadSimple } from 'phosphor-react-native/lib/module/icons/UploadSimple';
import { UserMinus } from 'phosphor-react-native/lib/module/icons/UserMinus';
import * as React from 'react';
import { ActivityIndicator, Keyboard, Pressable, View } from 'react-native';

const ROLE_LABELS: Record<string, string> = {
  [Role.Owner]: 'Owner',
  [Role.Admin]: 'Admin',
  [Role.Member]: 'Member',
};

const ASSIGNABLE_ROLES = [Role.Admin, Role.Member] as const;
type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];

const TeamMemberMenuContent = ({
  activeTeamId,
  canChangeToAdmin,
  canChangeToMember,
  canRemoveMember,
  canViewLogs,
  memberId,
  memberRole,
  onOpenMemberLogs,
  onOpenMemberLogsAfterDemotion,
}: {
  activeTeamId?: string;
  canChangeToAdmin: boolean;
  canChangeToMember: boolean;
  canRemoveMember: boolean;
  canViewLogs: boolean;
  memberId: string;
  memberRole: string;
  onOpenMemberLogs: (memberId: string) => void;
  onOpenMemberLogsAfterDemotion: (memberId: string) => void;
}) => {
  const colorScheme = useColorScheme();
  const sheetManager = useSheetManager();
  const { onOpenChange } = Menu.useContext();

  const [loadingRole, setLoadingRole] = React.useState<AssignableRole | null>(
    null
  );

  const handleRolePress = React.useCallback(
    async (nextRole: AssignableRole) => {
      if (loadingRole === nextRole) return;

      if (memberRole === nextRole) {
        if (nextRole === Role.Member) {
          onOpenChange(false);
          onOpenMemberLogs(memberId);
        }

        return;
      }

      if (!activeTeamId) return;
      setLoadingRole(nextRole);

      try {
        await updateRole({
          roleId: memberId,
          role: nextRole,
          teamId: activeTeamId,
        });

        if (nextRole === Role.Member) {
          onOpenChange(false);
          onOpenMemberLogsAfterDemotion(memberId);
        }
      } finally {
        setLoadingRole(null);
      }
    },
    [
      activeTeamId,
      loadingRole,
      memberId,
      memberRole,
      onOpenChange,
      onOpenMemberLogs,
      onOpenMemberLogsAfterDemotion,
    ]
  );

  return (
    <>
      {ASSIGNABLE_ROLES.map((r) => {
        const isDisabled =
          (r === Role.Admin && !canChangeToAdmin) ||
          (r === Role.Member && !canChangeToMember);

        return (
          <Menu.Item
            closeOnPress={false}
            disabled={isDisabled || !!loadingRole}
            key={r}
            onPress={() => handleRolePress(r)}
          >
            <View className="size-5 items-center justify-center">
              {loadingRole === r ? (
                <ActivityIndicator
                  size={16}
                  color={UI[colorScheme].mutedForeground}
                />
              ) : (
                memberRole === r && <Icon className="-mr-1" icon={Check} />
              )}
            </View>
            <Text className={loadingRole === r ? 'text-placeholder' : ''}>
              {ROLE_LABELS[r]}
            </Text>
          </Menu.Item>
        );
      })}
      {canViewLogs && (
        <>
          <Menu.Separator />
          <Menu.Item
            className={loadingRole ? 'opacity-50' : ''}
            disabled={!!loadingRole}
            onPress={() => onOpenMemberLogs(memberId)}
          >
            <Icon icon={SquaresFour} />
            <Text>Logs</Text>
          </Menu.Item>
        </>
      )}
      <Menu.Separator />
      <Menu.Item
        className={!canRemoveMember || loadingRole ? 'opacity-50' : ''}
        disabled={!canRemoveMember || !!loadingRole}
        onPress={() => sheetManager.open('member-remove', memberId)}
      >
        <Icon className="text-destructive" icon={UserMinus} />
        <Text className="text-destructive">Remove</Text>
      </Menu.Item>
    </>
  );
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

                const canShowMemberMenu = p.canOpenTeamMemberMenu({
                  actorRole: myRole.role,
                  isSelf,
                  targetRole: member.role,
                });

                const canChangeToAdmin = p.canChangeTeamMemberRole({
                  actorRole: myRole.role,
                  isSelf,
                  nextRole: Role.Admin,
                  targetRole: member.role,
                });

                const canChangeToMember = p.canChangeTeamMemberRole({
                  actorRole: myRole.role,
                  isSelf,
                  nextRole: Role.Member,
                  targetRole: member.role,
                });

                const canViewLogs = p.isMemberRole(member.role);

                const canRemoveMember = p.canRemoveTeamMember({
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
