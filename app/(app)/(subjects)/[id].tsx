import { ChevronLeft } from '@/components/icons/chevron-left';
import { Loading } from '@/components/loading';
import { Button } from '@/components/ui/button';
import { db } from '@/lib/utils';
import { Stack, useLocalSearchParams, useNavigation } from 'expo-router';
import * as React from 'react';

export default function Subject() {
  const { id } = useLocalSearchParams();
  const navigation = useNavigation();

  const { data, isLoading } = db.useQuery({
    subjects: {
      $: { where: { id: id as string } },
    },
  });

  if (isLoading) {
    return <Loading />;
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerLeft: () => (
            <Button onPress={navigation.goBack} size="icon" variant="link">
              <ChevronLeft className="color-foreground" size={24} />
            </Button>
          ),
          title: data?.subjects?.[0]?.name ?? '',
        }}
      />
    </>
  );
}
