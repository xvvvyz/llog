import * as permissions from '@/domain/teams/permissions';
import { Role } from '@/domain/teams/role';
import { openInviteSheet } from '@/features/invites/lib/sheet';
import { createInviteLink } from '@/features/invites/mutations/create-link';
import { useTeamInvites } from '@/features/invites/queries/use-team-links';
import { useLogs } from '@/features/logs/queries/use-logs';
import { TeamMemberMenuContent } from '@/features/teams/components/member-menu-content';
import { deleteTeamImage } from '@/features/teams/mutations/delete-image';
import { updateTeam } from '@/features/teams/mutations/update';
import { uploadTeamImage } from '@/features/teams/mutations/upload-image';
import { useMyRole } from '@/features/teams/queries/use-my-role';
import { useTeam } from '@/features/teams/queries/use-team';
import { useTeamMembers } from '@/features/teams/queries/use-team-members';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { db } from '@/lib/db';
import { UI } from '@/theme/ui';
import { Avatar } from '@/ui/avatar';
import { Button } from '@/ui/button';
import * as Menu from '@/ui/dropdown-menu';
import { Icon } from '@/ui/icon';
import { Input } from '@/ui/input';
import { Label } from '@/ui/label';
import { Sheet } from '@/ui/sheet';
import { SheetFooter, SheetListScrollView } from '@/ui/sheet-list';
import { Spinner } from '@/ui/spinner';
import { Text } from '@/ui/text';
import { launchImageLibraryAsync } from 'expo-image-picker';
import * as React from 'react';
import { Pressable, View } from 'react-native';

import {
  DotsThreeVertical,
  SignOut,
  Trash,
  UploadSimple,
  UserPlus,
  UsersThree,
} from 'phosphor-react-native';

const ROLE_LABELS: Record<string, string> = {
  [Role.Owner]: 'Owner',
  [Role.Admin]: 'Admin',
  [Role.Member]: 'Member',
};

const ROW_BUTTON_CLASS_NAME =
  'h-auto px-8 py-3 rounded-none gap-4 justify-between';

const ROW_BUTTON_WRAPPER_CLASS_NAME = '-mx-8 w-auto rounded-none';
const TEAM_NAME_INPUT_ID = 'team-name';

export const TeamSheet = () => {
  const sheetManager = useSheetManager();
  const open = sheetManager.isOpen('team');
  const teamId = sheetManager.getId('team');
  const [loadingAction, setLoadingAction] = React.useState<string | null>(null);
  const nameInputRef = React.useRef<React.ComponentRef<typeof Input>>(null);
  const colorScheme = useColorScheme();
  const team = useTeam({ teamId });
  const myRole = useMyRole({ teamId });
  const { canDeleteTeam, canManage } = myRole;
  const { invites } = useTeamInvites({ teamId });
  const logs = useLogs({ teamIds: teamId ? [teamId] : [] });
  const { members } = useTeamMembers({ teamId });

  const teamAdminCount = members.filter(
    (member) => member.role === Role.Owner || member.role === Role.Admin
  ).length;

  const logMemberCount = members.filter(
    (member) => member.role === Role.Member
  ).length;

  const inviteRoles = canManage
    ? [Role.Admin, Role.Member].filter(
        (role) => role === Role.Admin || logs.data.length > 0
      )
    : [];

  const hasTeamActionRows = inviteRoles.length > 0 || canDeleteTeam;

  const memberSummary = [
    teamAdminCount > 0
      ? `${teamAdminCount} team ${teamAdminCount === 1 ? 'admin' : 'admins'}`
      : null,
    logMemberCount > 0
      ? `${logMemberCount} ${logMemberCount === 1 ? 'member' : 'members'}`
      : null,
  ]
    .filter((part): part is string => !!part)
    .join(', ');

  const handleUploadTeamImage = React.useCallback(async () => {
    if (!teamId) return;

    const picker = await launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      exif: false,
    });

    if (picker.canceled) return;
    await uploadTeamImage(picker.assets[0], teamId);
  }, [teamId]);

  const getOrCreateAdminLink = React.useCallback(async () => {
    const existing = invites.find((l) => l.role === Role.Admin);
    if (existing) return existing;
    if (!teamId) return null;
    const invite = await createInviteLink({ teamId, role: Role.Admin });
    return { ...invite, teamId };
  }, [invites, teamId]);

  const getOrCreateAdminInvite = React.useCallback(async () => {
    const invite = await getOrCreateAdminLink();

    if (!invite?.id || !invite.token || !invite.teamId) {
      throw new Error('Failed to create invite link');
    }

    return { id: invite.id, teamId: invite.teamId, token: invite.token };
  }, [getOrCreateAdminLink]);

  const handleInvite = React.useCallback(
    async (role: string) => {
      if (role === Role.Member) {
        sheetManager.open('invite-logs', undefined, undefined, { teamId });
        return;
      }

      setLoadingAction(`invite-${role}`);

      try {
        const invite = await getOrCreateAdminInvite();
        openInviteSheet(sheetManager, invite);
      } finally {
        setLoadingAction(null);
      }
    },
    [getOrCreateAdminInvite, sheetManager, teamId]
  );

  return (
    <Sheet
      onDismiss={() => sheetManager.close('team')}
      open={open}
      portalName="team"
      variant="list"
    >
      <SheetListScrollView
        className="max-h-96"
        contentContainerClassName="gap-0 pb-4 pt-0"
        loading={team.isLoading}
        variant="rows"
      >
        <View>
          {canManage ? (
            <Menu.Root>
              <Menu.Trigger asChild>
                <Button
                  className="w-full pb-3 pt-3 px-8 rounded-none items-end justify-between"
                  variant="link"
                  wrapperClassName={ROW_BUTTON_WRAPPER_CLASS_NAME}
                >
                  <Text className="leading-tight text-base text-muted-foreground shrink-0">
                    Avatar
                  </Text>
                  <Avatar
                    avatar={team.image?.uri}
                    className="border-border-secondary border"
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
                      onPress={() => teamId && deleteTeamImage(teamId)}
                    >
                      <Icon className="text-destructive" icon={Trash} />
                      <Text className="text-destructive">Remove</Text>
                    </Menu.Item>
                  </>
                )}
              </Menu.Content>
            </Menu.Root>
          ) : (
            <View className="flex-row -mx-8 pb-3 pt-3 px-8 items-end justify-between">
              <Label className="p-0 shrink-0">Avatar</Label>
              <Avatar
                avatar={team.image?.uri}
                className="border-border-secondary border"
                fallback="gradient"
                id={team.id}
                size={42}
              />
            </View>
          )}
        </View>
        <View className="border-border border-t" />
        <View>
          <Pressable
            className="flex-row border-b border-border items-center justify-between"
            disabled={!canManage}
            onPress={() => nameInputRef.current?.focus()}
          >
            <Label
              className="p-0 shrink-0"
              nativeID={`${TEAM_NAME_INPUT_ID}-label`}
              onPress={() => nameInputRef.current?.focus()}
            >
              Name
            </Label>
            <Input
              ref={nameInputRef}
              accessibilityLabelledBy={`${TEAM_NAME_INPUT_ID}-label`}
              className="min-w-0 pr-0 border-0 rounded-none bg-transparent text-right shrink"
              editable={canManage}
              id={TEAM_NAME_INPUT_ID}
              maxLength={32}
              selectTextOnFocus
              value={team.name}
              onChangeText={(name) =>
                team.id && updateTeam({ id: team.id, name })
              }
            />
          </Pressable>
        </View>
        <Button
          className={ROW_BUTTON_CLASS_NAME}
          onPress={() => teamId && sheetManager.open('team-members', teamId)}
          variant="ghost"
          wrapperClassName={ROW_BUTTON_WRAPPER_CLASS_NAME}
        >
          <View className="flex-1">
            <Text className="font-normal leading-normal text-muted-foreground">
              {canManage ? 'Manage team' : 'View team'}
            </Text>
            {!!memberSummary && (
              <Text className="pb-0.5 font-normal leading-normal text-placeholder text-xs">
                {memberSummary}
              </Text>
            )}
          </View>
          <Icon className="text-placeholder" icon={UsersThree} />
        </Button>
        {hasTeamActionRows && <View className="border-border border-t" />}
        {inviteRoles.map((role, index) => {
          const hasItemBelow = index < inviteRoles.length - 1 || canDeleteTeam;

          return (
            <View key={role}>
              <Button
                className={ROW_BUTTON_CLASS_NAME}
                onPress={() => handleInvite(role)}
                variant="ghost"
                wrapperClassName={ROW_BUTTON_WRAPPER_CLASS_NAME}
              >
                <View className="flex-1">
                  <Text className="font-normal leading-normal text-muted-foreground">
                    Invite {role === Role.Admin ? 'team admins' : 'members'}
                  </Text>
                  <Text className="pb-0.5 font-normal leading-normal text-placeholder text-xs">
                    {role === Role.Admin
                      ? 'Can manage team and logs'
                      : 'Can access selected logs'}
                  </Text>
                </View>
                {loadingAction === `invite-${role}` ? (
                  <Spinner color={UI[colorScheme].mutedForeground} size="xs" />
                ) : (
                  <Icon className="text-placeholder" icon={UserPlus} />
                )}
              </Button>
              {hasItemBelow && <View className="border-border border-t" />}
            </View>
          );
        })}
        {canDeleteTeam && (
          <Button
            className={ROW_BUTTON_CLASS_NAME}
            variant="ghost"
            wrapperClassName={ROW_BUTTON_WRAPPER_CLASS_NAME}
            onPress={() =>
              sheetManager.open('team-delete', undefined, undefined, { teamId })
            }
          >
            <Text className="font-normal text-destructive">Delete team</Text>
            <Icon className="-mr-0.5 text-destructive" icon={Trash} />
          </Button>
        )}
      </SheetListScrollView>
      <SheetFooter>
        <Button
          onPress={() => sheetManager.close('team')}
          size="sm"
          variant="secondary"
          wrapperClassName="w-full"
        >
          <Text>Close</Text>
        </Button>
      </SheetFooter>
    </Sheet>
  );
};

export const TeamMembersSheet = () => {
  const sheetManager = useSheetManager();
  const open = sheetManager.isOpen('team-members');
  const teamId = sheetManager.getId('team-members');

  const [pendingMemberLogsRoleId, setPendingMemberLogsRoleId] = React.useState<
    string | null
  >(null);

  const auth = db.useAuth();
  const myRole = useMyRole({ teamId });
  const logs = useLogs({ teamIds: teamId ? [teamId] : [] });
  const { members, isLoading } = useTeamMembers({ teamId });
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

    sheetManager.open('member-logs', pendingMemberLogsRoleId, undefined, {
      teamId,
    });

    setPendingMemberLogsRoleId(null);
  }, [
    activeTeamLogIds,
    members,
    pendingMemberLogsRoleId,
    sheetManager,
    teamId,
  ]);

  const handleOpenMemberLogs = React.useCallback(
    (memberId: string) => {
      setPendingMemberLogsRoleId(null);
      sheetManager.open('member-logs', memberId, undefined, { teamId });
    },
    [sheetManager, teamId]
  );

  const handleOpenMemberLogsAfterDemotion = React.useCallback(
    (memberId: string) => {
      setPendingMemberLogsRoleId(memberId);
    },
    []
  );

  return (
    <Sheet
      onDismiss={() => sheetManager.close('team-members')}
      open={open}
      portalName="team-members"
      variant="list"
    >
      <SheetListScrollView loading={isLoading} variant="rows">
        {members.map((member) => {
          const profile = member.user?.profile;
          const isSelf = member.userId === auth.user?.id;
          const isLastOwner = member.role === Role.Owner && ownerCount <= 1;

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
              className="flex-row items-center justify-between"
            >
              <View className="flex-1 flex-row gap-3 items-center">
                <Avatar
                  avatar={profile?.image?.uri}
                  className="border-border-secondary border"
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
                      size="icon-xs"
                      variant="ghost"
                      wrapperClassName="-mr-action-menu-nudge"
                    >
                      <Icon
                        className="text-placeholder"
                        icon={DotsThreeVertical}
                      />
                    </Button>
                  </Menu.Trigger>
                  <Menu.Content align="end">
                    <TeamMemberMenuContent
                      activeTeamId={teamId}
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
                      size="icon-xs"
                      variant="ghost"
                      wrapperClassName="-mr-action-menu-nudge"
                    >
                      <Icon
                        className="text-placeholder"
                        icon={DotsThreeVertical}
                      />
                    </Button>
                  </Menu.Trigger>
                  <Menu.Content align="end">
                    <Menu.Item
                      onPress={() =>
                        sheetManager.open('team-leave', undefined, undefined, {
                          teamId,
                        })
                      }
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
      </SheetListScrollView>
      <SheetFooter>
        <Button
          onPress={() => sheetManager.close('team-members')}
          size="sm"
          variant="secondary"
          wrapperClassName="w-full"
        >
          <Text>Close</Text>
        </Button>
      </SheetFooter>
    </Sheet>
  );
};
