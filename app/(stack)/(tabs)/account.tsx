import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import * as Menu from '@/components/ui/dropdown-menu';
import { Header } from '@/components/ui/header';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Page } from '@/components/ui/page';
import { Switch } from '@/components/ui/switch';
import { Text } from '@/components/ui/text';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { deleteProfileImage } from '@/mutations/delete-profile-image';
import { updateProfile } from '@/mutations/update-profile';
import { uploadProfileImage } from '@/mutations/upload-profile-image';
import { useProfile } from '@/queries/use-profile';
import { useUi } from '@/queries/use-ui';
import { REACTION_EMOJIS, REACTION_ICONS } from '@/types/emoji';
import { alert } from '@/utilities/alert';
import { db } from '@/utilities/db';
import * as wp from '@/utilities/web-push';
import { launchImageLibraryAsync } from 'expo-image-picker';
import { router } from 'expo-router';
import { SignOut } from 'phosphor-react-native/lib/module/icons/SignOut';
import { Trash } from 'phosphor-react-native/lib/module/icons/Trash';
import { UploadSimple } from 'phosphor-react-native/lib/module/icons/UploadSimple';
import * as React from 'react';
import { Keyboard, Platform, Pressable, View } from 'react-native';

const NOTIFICATION_PERMISSION_ALERT = {
  message: 'Allow access to send notifications.',
  title: 'Notifications',
} as const;

export default function Account() {
  const [isPushPending, setIsPushPending] = React.useState(false);
  const [isSigningOut, setIsSigningOut] = React.useState(false);

  const [pendingPushState, setPendingPushState] =
    React.useState<wp.WebPushState | null>(null);

  const [pushState, setPushState] = React.useState<wp.WebPushState>({
    status: 'unsupported',
  });

  const [pushSupport, setPushSupport] =
    React.useState<wp.WebPushSupportState>('unsupported');

  const auth = db.useAuth();
  const nameInputRef = React.useRef<React.ComponentRef<typeof Input>>(null);
  const profile = useProfile();
  const sheetManager = useSheetManager();
  const ui = useUi();

  const handleSubmitName = React.useCallback(() => {
    nameInputRef.current?.blur();
  }, []);

  const handleUploadProfileImage = React.useCallback(async () => {
    const picker = await launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      exif: false,
    });

    if (picker.canceled) return;
    await uploadProfileImage(picker.assets[0]);
  }, []);

  React.useEffect(() => {
    if (Platform.OS !== 'web') return;
    setPushSupport(wp.getWebPushSupportState());
  }, []);

  React.useEffect(() => {
    if (Platform.OS !== 'web' || !auth.user) return;
    let cancelled = false;

    void (async () => {
      try {
        const state = await wp.syncWebPushSubscription();
        if (!cancelled) setPushState(state);
      } catch (error) {
        console.error('Failed to refresh web push state', error);
        const state = await wp.getWebPushState();
        if (!cancelled) setPushState(state);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [auth.user]);

  React.useEffect(() => {
    if (Platform.OS !== 'web' || !auth.user) return;

    const handleVisibilityChange = async () => {
      if (document.visibilityState !== 'visible') return;

      try {
        setPushState(await wp.getWebPushState());
      } catch (error) {
        console.error(error);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [auth.user]);

  const effectivePushState = pendingPushState ?? pushState;
  const pushEnabled = effectivePushState.status === 'enabled';

  const isPushToggleDisabled =
    isPushPending ||
    pushState.status === 'blocked' ||
    (!auth.user && pushSupport !== 'ios-home-screen-required') ||
    (effectivePushState.status === 'unsupported' &&
      pushSupport !== 'ios-home-screen-required');

  const handleTogglePush = React.useCallback(async () => {
    if (Platform.OS !== 'web') return;

    if (pushSupport === 'ios-home-screen-required') {
      sheetManager.open('web-push-ios-setup');
      return;
    }

    if (
      pushState.status === 'unsupported' ||
      pushState.status === 'blocked' ||
      !auth.user
    ) {
      return;
    }

    const optimisticState =
      pushState.status === 'enabled'
        ? ({
            status: 'disabled',
          } satisfies wp.WebPushState)
        : ({
            endpoint: pushState.endpoint,
            status: 'enabled',
          } satisfies wp.WebPushState);

    setPendingPushState(optimisticState);
    setIsPushPending(true);

    try {
      const nextState =
        pushState.status === 'enabled'
          ? await wp.disableWebPush()
          : await wp.enableWebPush();

      if (nextState.status === 'blocked') {
        alert(NOTIFICATION_PERMISSION_ALERT);
      }

      setPushState(nextState);
      setPendingPushState(null);
    } catch (error) {
      setPendingPushState(null);

      alert({
        message:
          error instanceof Error
            ? error.message
            : 'Failed to update notifications',
        title: 'Error',
      });
    } finally {
      setIsPushPending(false);
    }
  }, [auth.user, pushState, pushSupport, sheetManager]);

  return (
    <Page>
      <Header title="Account" />
      <View className="flex-1 items-center justify-center p-3">
        <Pressable className="absolute inset-0" onPress={Keyboard.dismiss} />
        <Card className="w-full max-w-xs overflow-hidden p-0">
          <View className="pb-2">
            <View className="px-4">
              <Menu.Root>
                <Menu.Trigger asChild>
                  <Button
                    className="border-border items-end justify-between rounded-none border-b px-0 pt-3 pb-3"
                    variant="link"
                  >
                    <Label className="shrink-0 p-0">Avatar</Label>
                    <Avatar
                      avatar={profile.image?.uri}
                      id={profile.id}
                      size={34}
                    />
                  </Button>
                </Menu.Trigger>
                <Menu.Content align="end">
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
              <View className="border-border flex-row items-center justify-between border-b">
                <Label
                  className="p-0"
                  onPress={() => nameInputRef.current?.focus()}
                >
                  Name
                </Label>
                <Input
                  blurOnSubmit
                  maxLength={32}
                  className="rounded-none border-0 bg-transparent pr-0 text-right"
                  onChangeText={(text) =>
                    updateProfile({ id: profile.id!, name: text })
                  }
                  onSubmitEditing={handleSubmitName}
                  ref={nameInputRef}
                  submitBehavior="blurAndSubmit"
                  value={profile.name}
                />
              </View>
            </View>
            <View className="px-4">
              <View className="border-border flex-row items-center justify-between border-b">
                <Label className="p-0">Email</Label>
                <Input
                  editable={false}
                  maxLength={32}
                  className="rounded-none border-0 bg-transparent pr-0 text-right"
                  value={auth.user?.email ?? undefined}
                />
              </View>
            </View>
            {Platform.OS === 'web' && (
              <View className="px-4">
                <Pressable
                  accessibilityRole="switch"
                  accessibilityState={{
                    checked: pushEnabled,
                    disabled: isPushToggleDisabled,
                  }}
                  className="border-border flex-row items-center justify-between gap-4 border-b py-3"
                  disabled={isPushToggleDisabled}
                  onPress={handleTogglePush}
                >
                  <View className="flex-1">
                    <Text className="text-muted-foreground font-normal">
                      Web notifications
                    </Text>
                    <Text className="text-placeholder pb-0.5 text-xs">
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
              </View>
            )}
            <Menu.Root>
              <Menu.Trigger asChild>
                <Button
                  className="justify-between rounded-none"
                  variant="ghost"
                  wrapperClassName="rounded-none"
                >
                  <Text className="font-normal">Double tap reaction</Text>
                  <Icon
                    className="text-primary -mr-0.5"
                    icon={REACTION_ICONS[ui.doubleTapEmoji]}
                    weight="fill"
                  />
                </Button>
              </Menu.Trigger>
              <Menu.Content align="end" className="flex-row px-1 py-1">
                {REACTION_EMOJIS.map((emoji) => (
                  <Menu.Item
                    key={emoji}
                    className="size-10 min-w-0 justify-center rounded-xl pr-0 pl-0"
                    onPress={() =>
                      ui.id &&
                      db.transact(
                        db.tx.ui[ui.id].update({
                          doubleTapEmoji: emoji,
                        })
                      )
                    }
                  >
                    <Icon
                      className={
                        ui.doubleTapEmoji === emoji
                          ? 'text-primary'
                          : 'text-muted-foreground'
                      }
                      icon={REACTION_ICONS[emoji]}
                      weight={ui.doubleTapEmoji === emoji ? 'fill' : 'regular'}
                    />
                  </Menu.Item>
                ))}
              </Menu.Content>
            </Menu.Root>
            <View className="border-border my-2 border-t" />
            <Button
              className="justify-between rounded-none"
              disabled={isSigningOut}
              onPress={async () => {
                setIsSigningOut(true);
                try {
                  if (Platform.OS === 'web') {
                    try {
                      await wp.detachWebPushSubscription();
                    } catch (error) {
                      console.error(
                        'Failed to detach web push subscription during sign out',
                        error
                      );
                    }
                  }

                  await db.auth.signOut();
                  router.navigate('/sign-in');
                } finally {
                  setIsSigningOut(false);
                }
              }}
              variant="ghost"
              wrapperClassName="rounded-none"
            >
              <Text className="font-normal">Sign out</Text>
              <Icon className="text-placeholder -mr-0.5" icon={SignOut} />
            </Button>
          </View>
        </Card>
      </View>
    </Page>
  );
}
