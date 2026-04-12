import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import * as Menu from '@/components/ui/dropdown-menu';
import { Header } from '@/components/ui/header';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Page } from '@/components/ui/page';
import { Text } from '@/components/ui/text';
import { deleteProfileImage } from '@/mutations/delete-profile-image';
import { updateProfile } from '@/mutations/update-profile';
import { uploadProfileImage } from '@/mutations/upload-profile-image';
import { useProfile } from '@/queries/use-profile';
import { useUi } from '@/queries/use-ui';
import { REACTION_EMOJIS, REACTION_ICONS } from '@/types/emoji';
import { db } from '@/utilities/db';
import { launchImageLibraryAsync } from 'expo-image-picker';
import { router } from 'expo-router';
import { SignOut } from 'phosphor-react-native/lib/module/icons/SignOut';
import { Trash } from 'phosphor-react-native/lib/module/icons/Trash';
import { UploadSimple } from 'phosphor-react-native/lib/module/icons/UploadSimple';
import { type ComponentRef, useCallback, useRef, useState } from 'react';
import { View } from 'react-native';

export default function Account() {
  const [isSigningOut, setIsSigningOut] = useState(false);
  const nameInputRef = useRef<ComponentRef<typeof Input>>(null);
  const auth = db.useAuth();
  const profile = useProfile();
  const ui = useUi();

  const handleUploadProfileImage = useCallback(async () => {
    const picker = await launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      exif: false,
    });

    if (picker.canceled) return;
    await uploadProfileImage(picker.assets[0]);
  }, []);

  return (
    <Page>
      <Header title="Account" />
      <View className="flex-1 items-center justify-center p-3">
        <Card className="w-full max-w-xs overflow-hidden p-0">
          <View className="items-center justify-center py-8">
            <Menu.Root>
              <Menu.Trigger asChild>
                <Button variant="link">
                  <Avatar
                    avatar={profile.image?.uri}
                    id={profile.id}
                    size={156}
                  />
                </Button>
              </Menu.Trigger>
              <Menu.Content align="center" className="mt-3">
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
          <View className="pb-2">
            <View className="px-4">
              <View className="flex-row items-center justify-between border-b border-border">
                <Label
                  className="p-0"
                  onPress={() => nameInputRef.current?.focus()}
                >
                  Name
                </Label>
                <Input
                  maxLength={32}
                  className="rounded-none border-0 bg-transparent pr-0 text-right"
                  onChangeText={(text) =>
                    updateProfile({ id: profile.id, name: text })
                  }
                  ref={nameInputRef}
                  value={profile.name}
                />
              </View>
            </View>
            <View className="px-4">
              <View className="flex-row items-center justify-between border-b border-border">
                <Label className="p-0">Email</Label>
                <Input
                  editable={false}
                  maxLength={32}
                  className="rounded-none border-0 bg-transparent pr-0 text-right"
                  value={auth.user?.email ?? undefined}
                />
              </View>
            </View>
            <Menu.Root>
              <Menu.Trigger asChild>
                <Button
                  className="justify-between rounded-none"
                  variant="ghost"
                  wrapperClassName="rounded-none"
                >
                  <Text className="font-normal">Double tap reaction</Text>
                  <Icon
                    className="-mr-0.5"
                    icon={REACTION_ICONS[ui.doubleTapEmoji]}
                  />
                </Button>
              </Menu.Trigger>
              <Menu.Content align="center" className="flex-row px-1 py-1">
                {REACTION_EMOJIS.map((emoji) => (
                  <Menu.Item
                    key={emoji}
                    className="size-10 min-w-0 justify-center rounded-xl pl-0 pr-0"
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
            <Button
              className="justify-between rounded-none"
              disabled={isSigningOut}
              onPress={async () => {
                setIsSigningOut(true);
                await db.auth.signOut();
                router.navigate('/sign-in');
              }}
              variant="ghost"
              wrapperClassName="rounded-none pt-4"
            >
              <Text className="font-normal">Sign out</Text>
              <Icon className="-mr-0.5 text-placeholder" icon={SignOut} />
            </Button>
          </View>
        </Card>
      </View>
    </Page>
  );
}
