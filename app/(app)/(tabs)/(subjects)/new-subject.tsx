import { ChevronLeft } from '@/components/icons/chevron-left';
import { Button } from '@/components/ui/button';
import { Stack, useNavigation } from 'expo-router';
import * as React from 'react';

export default function NewSubject() {
  const navigation = useNavigation();

  return (
    <>
      <Stack.Screen
        options={{
          headerLeft: () => (
            <Button onPress={navigation.goBack} size="icon" variant="link">
              <ChevronLeft className="color-foreground" size={24} />
            </Button>
          ),
          title: 'New subject',
        }}
      />
    </>
  );
}
