import { Avatar } from '@/components/ui/avatar';
import { BackButton } from '@/components/ui/back-button';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import * as Menu from '@/components/ui/dropdown-menu';
import { Header } from '@/components/ui/header';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Page } from '@/components/ui/page';
import { Text } from '@/components/ui/text';
import { useSheetManager } from '@/context/sheet-manager';
import { Role } from '@/enums/roles';
import { cancelInvite } from '@/mutations/cancel-invite';
import { removeMember } from '@/mutations/remove-member';
import { updateInvite } from '@/mutations/update-invite';
import { updateRole } from '@/mutations/update-role';
import { updateTeam } from '@/mutations/update-team';
import { useMyRole } from '@/queries/use-my-role';
import { useTeam } from '@/queries/use-team';
import { useTeamInvites } from '@/queries/use-team-invites';
import { useTeamMembers } from '@/queries/use-team-members';
import { useTeams } from '@/queries/use-teams';
import { useUi } from '@/queries/use-ui';
import { db } from '@/utilities/db';
import {
  CaretDown,
  Check,
  SignOut,
  Trash,
  UserMinus,
  UserPlus,
  X,
} from 'phosphor-react-native';
import { ScrollView, View } from 'react-native';

const ROLE_LABELS: Record<string, string> = {
  [Role.Owner]: 'Owner',
  [Role.Admin]: 'Admin',
  [Role.Recorder]: 'Recorder',
};

export default function Team() {
  const auth = db.useAuth();
  const sheetManager = useSheetManager();
  const { activeTeamId } = useUi();
  const team = useTeam();
  const { teams } = useTeams();
  const { members } = useTeamMembers();
  const { invites } = useTeamInvites();
  const myRole = useMyRole();
  const { canManage, isOwner } = myRole;

  const ownerCount = members.filter((m) => m.role === Role.Owner).length;

  return (
    <Page>
      <Header left={<BackButton />} title={team.name} />
      <ScrollView contentContainerClassName="items-center justify-center flex-1 p-3">
        <Card className="w-full max-w-xs overflow-hidden p-0">
          <View className="pb-2">
            <View className="px-4">
              <View className="flex-row items-center justify-between border-b border-border pt-2">
                <Label className="shrink-0 p-0">Team name</Label>
                <Input
                  editable={isOwner}
                  maxLength={32}
                  className="min-w-0 shrink rounded-none border-0 bg-transparent pr-0 text-right"
                  onChangeText={(name) => updateTeam({ id: team.id, name })}
                  value={team.name}
                />
              </View>
            </View>
            <View className="px-4">
              <View className="pb-2 pt-6">
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
                          size={36}
                        />
                        <View className="flex-1">
                          <Text className="text-sm" numberOfLines={1}>
                            {profile?.name ?? 'Unknown'}
                            {isSelf ? (
                              <Text className="text-sm text-placeholder">
                                {' '}
                                (you)
                              </Text>
                            ) : null}
                          </Text>
                          <Text className="text-xs text-placeholder">
                            {ROLE_LABELS[member.role] ?? member.role}
                          </Text>
                        </View>
                      </View>
                      {isOwner && !isSelf && (
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
                                icon={CaretDown}
                              />
                            </Button>
                          </Menu.Trigger>
                          <Menu.Content align="end">
                            {[Role.Owner, Role.Admin, Role.Recorder].map(
                              (r) => (
                                <Menu.Item
                                  className="justify-between"
                                  key={r}
                                  onPress={() =>
                                    updateRole({
                                      id: member.id,
                                      role: r,
                                      teamId: activeTeamId!,
                                      userId: member.userId,
                                    })
                                  }
                                >
                                  <Text>{ROLE_LABELS[r]}</Text>
                                  {member.role === r && (
                                    <Icon className="-mr-1" icon={Check} />
                                  )}
                                </Menu.Item>
                              )
                            )}
                            <Menu.Separator />
                            <Menu.Item
                              onPress={() => removeMember({ id: member.id })}
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
                      {isSelf && !isLastOwner && teams.length > 1 && (
                        <Button
                          className="size-8"
                          variant="ghost"
                          size="icon"
                          onPress={() => sheetManager.open('team-leave')}
                          wrapperClassName="-mr-[7px]"
                        >
                          <Icon className="text-placeholder" icon={SignOut} />
                        </Button>
                      )}
                    </View>
                  );
                })}
                {canManage &&
                  invites.map((invite) => (
                    <View
                      className="flex-row items-center justify-between py-2.5"
                      key={invite.id}
                    >
                      <View className="flex-1">
                        <Text
                          className="text-sm text-placeholder"
                          numberOfLines={1}
                        >
                          {invite.email}
                        </Text>
                        <Text className="text-xs text-placeholder">
                          {ROLE_LABELS[invite.role] ?? invite.role} &middot;
                          Invite pending
                        </Text>
                      </View>
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
                              icon={CaretDown}
                            />
                          </Button>
                        </Menu.Trigger>
                        <Menu.Content align="end">
                          {[Role.Owner, Role.Admin, Role.Recorder].map((r) => (
                            <Menu.Item
                              className="justify-between"
                              key={r}
                              onPress={() =>
                                updateInvite({ id: invite.id, role: r })
                              }
                            >
                              <Text>{ROLE_LABELS[r]}</Text>
                              {invite.role === r && (
                                <Icon className="-mr-1" icon={Check} />
                              )}
                            </Menu.Item>
                          ))}
                          <Menu.Separator />
                          <Menu.Item
                            onPress={() => cancelInvite({ id: invite.id })}
                          >
                            <Icon className="text-destructive" icon={X} />
                            <Text className="text-destructive">
                              Cancel invite
                            </Text>
                          </Menu.Item>
                        </Menu.Content>
                      </Menu.Root>
                    </View>
                  ))}
              </View>
            </View>
            <View>
              {canManage && (
                <Button
                  className="justify-between rounded-none"
                  onPress={() => sheetManager.open('invite-member')}
                  variant="ghost"
                  wrapperClassName="rounded-none"
                >
                  <Text className="font-normal">Invite team member</Text>
                  <Icon className="-mr-0.5 text-placeholder" icon={UserPlus} />
                </Button>
              )}
              {isOwner && teams.length > 1 && (
                <View className="my-2 border-t border-border" />
              )}
              {isOwner && teams.length > 1 && (
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
              )}
            </View>
          </View>
        </Card>
      </ScrollView>
    </Page>
  );
}
