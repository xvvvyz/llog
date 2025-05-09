import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { db } from '@/lib/utils';
import { router } from 'expo-router';
import * as React from 'react';
import { View } from 'react-native';

export default function Profile() {
  return (
    <View className="flex-1 items-center justify-center">
      <Button
        onPress={() => {
          db.auth.signOut();
          router.dismissTo('/sign-in');
        }}
        variant="link"
      >
        <Text>Log out</Text>
      </Button>
    </View>
  );
}
