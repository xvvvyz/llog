import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import * as Menu from '@/components/ui/dropdown-menu';
import { Header } from '@/components/ui/header';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import { deleteAvatar } from '@/mutations/delete-avatar';
import { updateProfile } from '@/mutations/update-profile';
import { uploadAvatar } from '@/mutations/upload-avatar';
import { useProfile } from '@/queries/use-profile';
import { db } from '@/utilities/ui/db';
import { router } from 'expo-router';
import { LogOut, Trash, Upload } from 'lucide-react-native';
import { Fragment, useState } from 'react';
import { View } from 'react-native';

export default function Account() {
  const [isSigningOut, setIsSigningOut] = useState(false);
  const auth = db.useAuth();
  const profile = useProfile();

  return (
    <Fragment>
      <Header title="Account" />
      <View className="flex-1 items-center justify-center p-3">
        <Card className="w-full max-w-xs overflow-hidden p-0">
          <View className="items-center justify-center py-8">
            <Menu.Root>
              <Menu.Trigger asChild>
                <Button variant="link">
                  <Avatar
                    avatar={profile.avatar}
                    height={112}
                    id={profile.id}
                    width={112}
                  />
                </Button>
              </Menu.Trigger>
              <Menu.Content align="center" className="mt-3">
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
                  className="rounded-none border-0 bg-transparent pr-0 text-right"
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
                  className="rounded-none border-0 bg-transparent pr-0 text-right"
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
              <Icon
                className="-mr-1 text-placeholder"
                icon={LogOut}
                size={20}
              />
            </Button>
          </View>
        </Card>
      </View>
    </Fragment>
  );
}
