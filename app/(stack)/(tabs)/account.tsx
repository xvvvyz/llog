import { REACTION_EMOJIS } from '@/domain/records/reactions';
import { useSignOut } from '@/features/account/hooks/use-sign-out';
import { useWebPushNotifications } from '@/features/account/hooks/use-web-push-notifications';
import { deleteProfileImage } from '@/features/account/mutations/delete-profile-image';
import { randomizeProfileAvatar } from '@/features/account/mutations/randomize-profile-avatar';
import { updateProfile } from '@/features/account/mutations/update-profile';
import { uploadProfileImage } from '@/features/account/mutations/upload-profile-image';
import { useProfile } from '@/features/account/queries/use-profile';
import { useUi } from '@/features/account/queries/use-ui';
import { REACTION_ICONS } from '@/features/records/lib/reaction-icons';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { cn } from '@/lib/cn';
import { db } from '@/lib/db';
import { Avatar } from '@/ui/avatar';
import { Button } from '@/ui/button';
import { Card } from '@/ui/card';
import * as Menu from '@/ui/dropdown-menu';
import { Header } from '@/ui/header';
import { Icon } from '@/ui/icon';
import { Input } from '@/ui/input';
import { Label } from '@/ui/label';
import { Page } from '@/ui/page';
import { Spinner } from '@/ui/spinner';
import { Switch } from '@/ui/switch';
import { Text } from '@/ui/text';
import { launchImageLibraryAsync } from 'expo-image-picker';
import * as React from 'react';
import { Keyboard, Platform, Pressable, View } from 'react-native';

import {
  PlugsConnected,
  Shuffle,
  SignOut,
  Trash,
  UploadSimple,
} from 'phosphor-react-native';

const ACCOUNT_EMAIL_INPUT_ID = 'account-email';
const ACCOUNT_NAME_INPUT_ID = 'account-name';

export default function Account() {
  const auth = db.useAuth();
  const nameInputRef = React.useRef<React.ComponentRef<typeof Input>>(null);
  const profile = useProfile();
  const sheetManager = useSheetManager();
  const { isSigningOut, signOut } = useSignOut();
  const ui = useUi();

  const handleIosPushSetupRequired = React.useCallback(
    () => sheetManager.open('web-push-ios-setup'),
    [sheetManager]
  );

  const { handleTogglePush, isPushToggleDisabled, pushEnabled, pushState } =
    useWebPushNotifications({
      isSignedIn: !!auth.user,
      onIosSetupRequired: handleIosPushSetupRequired,
    });

  const handleUploadProfileImage = React.useCallback(async () => {
    const picker = await launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      exif: false,
    });

    if (picker.canceled) return;
    await uploadProfileImage(picker.assets[0]);
  }, []);

  const handleRandomizeProfileAvatar = React.useCallback(async () => {
    await randomizeProfileAvatar({ profileId: profile.id });
  }, [profile.id]);

  return (
    <Page>
      <Header title="Account" />
      <View className="flex-1 p-3 items-center justify-center">
        <Pressable className="absolute inset-0" onPress={Keyboard.dismiss} />
        <Card className="overflow-hidden max-w-xs w-full p-0">
          <View className="pb-2">
            <View className="px-4">
              <Menu.Root>
                <Menu.Trigger asChild>
                  <Button
                    className="w-full px-0 py-3 rounded-none justify-center"
                    variant="link"
                    wrapperClassName="w-full my-2 rounded-none"
                  >
                    <Avatar
                      avatar={profile.image?.uri}
                      className="border-border-secondary border"
                      id={profile.id}
                      seedId={profile.avatarSeedId}
                      size={84}
                    />
                  </Button>
                </Menu.Trigger>
                <Menu.Content align="center" className="my-0">
                  {!profile.image && (
                    <Menu.Item onPress={handleRandomizeProfileAvatar}>
                      <Icon className="text-placeholder" icon={Shuffle} />
                      <Text>Randomize</Text>
                    </Menu.Item>
                  )}
                  <Menu.Item onPress={handleUploadProfileImage}>
                    <Icon className="text-placeholder" icon={UploadSimple} />
                    <Text>Upload</Text>
                  </Menu.Item>
                  {profile.image && (
                    <>
                      <Menu.Separator />
                      <Menu.Item onPress={deleteProfileImage}>
                        <Icon className="text-destructive" icon={Trash} />
                        <Text className="text-destructive">Remove</Text>
                      </Menu.Item>
                    </>
                  )}
                </Menu.Content>
              </Menu.Root>
            </View>
            <View className="px-4">
              <Pressable
                className="flex-row border-b border-border items-center justify-between"
                onPress={() => nameInputRef.current?.focus()}
              >
                <Label
                  className="p-0"
                  nativeID={`${ACCOUNT_NAME_INPUT_ID}-label`}
                  onPress={() => nameInputRef.current?.focus()}
                >
                  Name
                </Label>
                <Input
                  ref={nameInputRef}
                  accessibilityLabelledBy={`${ACCOUNT_NAME_INPUT_ID}-label`}
                  className="pr-0 border-0 rounded-none bg-transparent text-right"
                  id={ACCOUNT_NAME_INPUT_ID}
                  maxLength={32}
                  selectTextOnFocus
                  value={profile.name}
                  onChangeText={(text) =>
                    updateProfile({ id: profile.id!, name: text })
                  }
                />
              </Pressable>
            </View>
            <View className="px-4">
              <View className="flex-row border-b border-border items-center justify-between">
                <Label
                  className="p-0"
                  nativeID={`${ACCOUNT_EMAIL_INPUT_ID}-label`}
                >
                  Email
                </Label>
                <Input
                  accessibilityLabelledBy={`${ACCOUNT_EMAIL_INPUT_ID}-label`}
                  className="pr-0 border-0 rounded-none bg-transparent text-right"
                  editable={false}
                  id={ACCOUNT_EMAIL_INPUT_ID}
                  maxLength={32}
                  value={auth.user?.email ?? undefined}
                />
              </View>
            </View>
            {Platform.OS === 'web' && (
              <>
                <Pressable
                  accessibilityRole="switch"
                  disabled={isPushToggleDisabled}
                  onPress={handleTogglePush}
                  accessibilityState={{
                    checked: pushEnabled,
                    disabled: isPushToggleDisabled,
                  }}
                  className={cn(
                    'flex-row px-4 py-3 gap-4 items-center justify-between',
                    isPushToggleDisabled && 'opacity-50'
                  )}
                >
                  <View className="flex-1">
                    <Text className="font-normal text-muted-foreground">
                      Notifications
                    </Text>
                    <Text className="pb-0.5 text-placeholder text-xs">
                      {pushState.status === 'blocked'
                        ? 'Blocked in browser or device settings'
                        : 'Receive new record & reply alerts'}
                    </Text>
                  </View>
                  <Switch
                    checked={pushEnabled}
                    className="pointer-events-none"
                    disabled={isPushToggleDisabled}
                    onCheckedChange={handleTogglePush}
                  />
                </Pressable>
                <View className="mx-4 border-border border-t" />
              </>
            )}
            <Button
              className="h-auto px-4 py-3 rounded-none gap-4 justify-between"
              onPress={() => sheetManager.open('mcp')}
              variant="ghost"
              wrapperClassName="w-full rounded-none"
            >
              <View className="flex-1">
                <Text className="font-normal leading-normal text-muted-foreground">
                  Connect AI apps
                </Text>
                <Text className="pb-0.5 font-normal leading-normal text-placeholder text-xs">
                  Works with ChatGPT, Claude & more
                </Text>
              </View>
              <Icon
                className="-mr-0.5 text-placeholder"
                icon={PlugsConnected}
              />
            </Button>
            <View className="mx-4 border-border border-t" />
            <Menu.Root>
              <Menu.Trigger asChild>
                <Button
                  className="h-auto py-3 rounded-none gap-4 justify-between"
                  variant="ghost"
                  wrapperClassName="rounded-none"
                >
                  <View className="flex-1">
                    <Text className="font-normal leading-normal">
                      Double tap reaction
                    </Text>
                    <Text className="pb-0.5 font-normal leading-normal text-placeholder text-xs">
                      Double tap beside reactions to use this
                    </Text>
                  </View>
                  <Icon
                    className="-mr-0.5 text-primary"
                    icon={REACTION_ICONS[ui.doubleTapEmoji]}
                    weight="fill"
                  />
                </Button>
              </Menu.Trigger>
              <Menu.Content align="end" className="flex-row px-1 py-1">
                {REACTION_EMOJIS.map((emoji) => (
                  <Menu.Item
                    key={emoji}
                    className="min-w-0 size-10 pl-0 pr-0 rounded-xl justify-center"
                    onPress={() =>
                      ui.id &&
                      db.transact(
                        db.tx.ui[ui.id].update({ doubleTapEmoji: emoji })
                      )
                    }
                  >
                    <Icon
                      icon={REACTION_ICONS[emoji]}
                      weight={ui.doubleTapEmoji === emoji ? 'fill' : 'regular'}
                      className={
                        ui.doubleTapEmoji === emoji
                          ? 'text-primary'
                          : 'text-muted-foreground'
                      }
                    />
                  </Menu.Item>
                ))}
              </Menu.Content>
            </Menu.Root>
            <View className="mx-4 border-border border-t" />
            <Button
              className="rounded-none justify-between"
              disabled={isSigningOut}
              onPress={signOut}
              variant="ghost"
              wrapperClassName="rounded-none"
            >
              <Text className="font-normal">Sign out</Text>
              {isSigningOut ? (
                <View className="-mr-0.5 w-5 items-center">
                  <Spinner className="text-placeholder" size="xs" />
                </View>
              ) : (
                <Icon className="-mr-0.5 text-placeholder" icon={SignOut} />
              )}
            </Button>
          </View>
        </Card>
      </View>
    </Page>
  );
}
