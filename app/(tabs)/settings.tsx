import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { db } from '@/utilities/db';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

export default function Settings() {
  const [isSigningOut, setIsSigningOut] = useState(false);
  const auth = db.useAuth();

  return (
    <View className="flex-1 items-center justify-center gap-8">
      <Text className="text-muted-foreground">{auth.user?.email}</Text>
      <Button
        disabled={isSigningOut}
        onPress={async () => {
          setIsSigningOut(true);
          await db.auth.signOut();
          router.navigate('/sign-in');
        }}
        variant="secondary"
      >
        <Text>Sign out</Text>
      </Button>
    </View>
  );
}
