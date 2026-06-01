import * as permissions from '@/domain/teams/permissions';
import { Role } from '@/domain/teams/role';
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
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { db } from '@/lib/db';
import { Avatar } from '@/ui/avatar';
import { Button } from '@/ui/button';
import * as Menu from '@/ui/dropdown-menu';
import { Icon } from '@/ui/icon';
import * as inputGroup from '@/ui/input-group';
import { Input } from '@/ui/input';
import { Label } from '@/ui/label';
import { Sheet } from '@/ui/sheet';
import { SheetFooter, SheetListScrollView } from '@/ui/sheet-list';
import { Spinner } from '@/ui/spinner';
import { Text } from '@/ui/text';
import { launchImageLibraryAsync } from 'expo-image-picker';
import * as React from 'react';
import { Pressable, View } from 'react-native';
import * as inviteLinkField from '@/features/invites/components/invite-link-field';

import {
  DotsThreeVertical,
  LinkBreak,
  Plus,
  SignOut,
  Trash,
  UploadSimple,
  UsersThree,
} from 'phosphor-react-native';

const ROLE_LABELS: Record<string, string> = {
  [Role.Owner]: 'Owner',
  [Role.Admin]: 'Admin',
  [Role.Member]: 'Member',
};

const TEAM_NAME_INPUT_ID = 'team-name';

const TeamAdminInviteLinkField = ({
  invite,
  isLoading,
  teamId,
}: {
  invite?: inviteLinkField.InviteLinkFieldInvite;
  isLoading?: boolean;
  teamId?: string;
}) => {
  const getOrCreateInvite = React.useCallback(async () => {
    if (!teamId) return;
    if (invite?.id && invite.teamId && invite.token) return invite;
    const createdInvite = await createInviteLink({ role: Role.Admin, teamId });
    return { ...createdInvite, teamId };
  }, [invite, teamId]);

  return (
    <inviteLinkField.InviteLinkField
      createLabel="Admin"
      invite={invite}
      isLoading={isLoading}
      onGetOrCreateInvite={getOrCreateInvite}
      teamId={teamId}
      viewLabel="Admin"
    />
  );
};

const TeamMemberInviteLinkButton = ({
  disabled,
  isInvalidateDisabled,
  isLoading,
  onInvalidate,
  onPress,
}: {
  disabled?: boolean;
  isInvalidateDisabled?: boolean;
  isLoading?: boolean;
  onInvalidate: () => void;
  onPress: () => void;
}) => (
  <inputGroup.InputGroup size="xs">
    <Button
      className="flex-1 h-full min-w-0 rounded-none justify-start"
      disabled={disabled || isLoading}
      onPress={onPress}
      size="xs"
      variant="ghost"
      wrapperClassName="h-full flex-1 min-w-0 rounded-none"
    >
      {isLoading ? (
        <Spinner size="xxs" />
      ) : (
        <Icon className="text-muted-foreground" icon={Plus} size={16} />
      )}
      <Text className="flex-1 min-w-0 native:leading-5" numberOfLines={1}>
        Member
      </Text>
    </Button>
    <Button
      accessibilityLabel="Invalidate all member invite links"
      className="h-full rounded-none"
      disabled={isInvalidateDisabled}
      onPress={onInvalidate}
      size="icon-xs"
      variant="ghost"
      wrapperClassName="h-full shrink-0 rounded-none border-l border-border-secondary"
    >
      <Icon icon={LinkBreak} size={16} />
    </Button>
  </inputGroup.InputGroup>
);

export const TeamSheet = () => {
  const sheetManager = useSheetManager();
  const open = sheetManager.isOpen('team');
  const teamId = sheetManager.getId('team');
  const nameInputRef = React.useRef<React.ComponentRef<typeof Input>>(null);
  const team = useTeam({ teamId });
  const myRole = useMyRole({ teamId });
  const { canDeleteTeam, canManage } = myRole;
  const { members } = useTeamMembers({ teamId });

  const teamAdminCount = members.filter(
    (member) => member.role === Role.Owner || member.role === Role.Admin
  ).length;

  const logMemberCount = members.filter(
    (member) => member.role === Role.Member
  ).length;

  const memberSummary = [
    teamAdminCount > 0
      ? `${teamAdminCount} ${teamAdminCount === 1 ? 'admin' : 'admins'}`
      : null,
    `${logMemberCount} ${logMemberCount === 1 ? 'member' : 'members'}`,
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
                  wrapperClassName="-mx-8 w-auto rounded-none"
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
          className="h-auto px-8 py-3 rounded-none gap-4 justify-between"
          onPress={() => teamId && sheetManager.open('team-members', teamId)}
          variant="ghost"
          wrapperClassName="-mx-8 w-auto rounded-none"
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
        {canDeleteTeam && <View className="border-border border-t" />}
        {canDeleteTeam && (
          <Button
            className="h-auto px-8 py-3 rounded-none gap-4 justify-between"
            variant="ghost"
            wrapperClassName="-mx-8 w-auto rounded-none"
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
  const auth = db.useAuth();
  const myRole = useMyRole({ teamId });
  const logs = useLogs({ teamIds: teamId ? [teamId] : [] });
  const { members, isLoading } = useTeamMembers({ teamId });
  const { invites, isLoading: invitesLoading } = useTeamInvites({ teamId });
  const ownerCount = members.filter((m) => m.role === Role.Owner).length;
  const canShowInviteLinks = myRole.canManage;
  const canCreateMemberInvite = logs.data.length > 0;

  const [pendingMemberLogsRoleId, setPendingMemberLogsRoleId] = React.useState<
    string | null
  >(null);

  const adminInvite = React.useMemo(
    () => invites.find((invite) => invite.role === Role.Admin),
    [invites]
  );

  const memberInviteCount = invites.filter(
    (invite) => invite.role === Role.Member
  ).length;

  const activeTeamLogIds = React.useMemo(
    () => new Set(logs.data.map((log) => log.id)),
    [logs.data]
  );

  React.useEffect(() => {
    if (!pendingMemberLogsRoleId) return;

    if (!open) {
      setPendingMemberLogsRoleId(null);
      return;
    }

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
    open,
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

  const handleCreateMemberInvite = React.useCallback(() => {
    sheetManager.open('invite-logs', undefined, undefined, { teamId });
  }, [sheetManager, teamId]);

  const handleInvalidateMemberInvites = React.useCallback(() => {
    sheetManager.open('invite-delete', Role.Member, undefined, { teamId });
  }, [sheetManager, teamId]);

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
      <SheetFooter contentClassName="gap-3">
        {canShowInviteLinks && (
          <View className="flex-row gap-3">
            <View className="flex-1 min-w-0">
              <TeamAdminInviteLinkField
                invite={adminInvite}
                isLoading={invitesLoading}
                teamId={teamId}
              />
            </View>
            <View className="flex-1 min-w-0">
              <TeamMemberInviteLinkButton
                disabled={!canCreateMemberInvite}
                isInvalidateDisabled={invitesLoading || memberInviteCount === 0}
                isLoading={logs.isLoading}
                onInvalidate={handleInvalidateMemberInvites}
                onPress={handleCreateMemberInvite}
              />
            </View>
          </View>
        )}
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
