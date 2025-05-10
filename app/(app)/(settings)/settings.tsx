import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { db } from '@/lib/utils';
import { router } from 'expo-router';
import * as React from 'react';
import { View } from 'react-native';

export default function Settings() {
  const [isSigningOut, setIsSigningOut] = React.useState(false);

  return (
    <View className="flex-1 items-center justify-center">
      <Button
        disabled={isSigningOut}
        onPress={async () => {
          setIsSigningOut(true);
          await db.auth.signOut();
          router.dismissTo('/sign-in');
        }}
        size="sm"
        variant="secondary"
      >
        <Text className="font-normal">Log out</Text>
      </Button>
    </View>
  );
}
