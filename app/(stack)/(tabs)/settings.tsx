import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { db } from '@/utilities/db';
import { router } from 'expo-router';
import { useState } from 'react';

export default function Settings() {
  const [isSigningOut, setIsSigningOut] = useState(false);

  return (
    <View className="flex-1 items-center justify-center">
      <Button
        disabled={isSigningOut}
        onPress={async () => {
          setIsSigningOut(true);
          await db.auth.signOut();
          router.navigate('/auth/sign-in');
        }}
        size="sm"
        variant="secondary"
      >
        <Text>Sign out</Text>
      </Button>
    </View>
  );
}
