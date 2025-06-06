import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import * as Menu from '@/components/ui/dropdown-menu';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import { deleteAvatar } from '@/mutations/delete-avatar';
import { updateProfile } from '@/mutations/update-profile';
import { uploadAvatar } from '@/mutations/upload-avatar';
import { useProfile } from '@/queries/use-profile';
import { db } from '@/utilities/db';
import { router } from 'expo-router';
import { LogOut, Trash, Upload } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

export default function Profile() {
  const [isSigningOut, setIsSigningOut] = useState(false);
  const auth = db.useAuth();
  const profile = useProfile();

  return (
    <View className="flex-1 items-center justify-center p-3">
      <View
        className="w-full max-w-xs overflow-hidden rounded-2xl border border-border-secondary bg-card"
        style={{ borderCurve: 'continuous' }}
      >
        <View className="items-center justify-center py-8">
          <Menu.Root>
            <Menu.Trigger asChild>
              <Button variant="link">
                <Avatar
                  avatar={profile.avatar}
                  className="size-28"
                  id={profile.id}
                />
              </Button>
            </Menu.Trigger>
            <Menu.Content className="mt-3">
              <Menu.Item onPress={uploadAvatar}>
                <Icon className="text-placeholder" icon={Upload} size={20} />
                <Text>Upload</Text>
              </Menu.Item>
              {profile.avatar && (
                <Menu.Item onPress={deleteAvatar}>
                  <Icon className="text-placeholder" icon={Trash} size={20} />
                  <Text>Remove</Text>
                </Menu.Item>
              )}
            </Menu.Content>
          </Menu.Root>
        </View>
        <View className="pb-2">
          <View className="px-4">
            <View className="flex-row items-center justify-between border-b border-border">
              <Label className="p-0">Name</Label>
              <Input
                maxLength={32}
                className="w-full rounded-none border-none bg-transparent pr-0 text-right"
                onChangeText={(text) =>
                  updateProfile({ id: profile.id, name: text })
                }
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
                className="w-full rounded-none border-none bg-transparent pr-0 text-right"
                value={auth.user?.email}
              />
            </View>
          </View>
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
            <Icon className="-mr-1 text-placeholder" icon={LogOut} size={20} />
          </Button>
        </View>
      </View>
    </View>
  );
}
