import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useAuth } from '@/lib/auth';
import * as React from 'react';
import { View } from 'react-native';

export default function Profile() {
  const auth = useAuth();

  return (
    <View className="flex-1 items-center justify-center">
      <Button onPress={auth.signOut} variant="link">
        <Text>Log out</Text>
      </Button>
    </View>
  );
}
