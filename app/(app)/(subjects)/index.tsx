import { ChevronRight } from '@/components/icons/chevron-right';
import { Plus } from '@/components/icons/plus';
import { Loading } from '@/components/loading';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { db } from '@/lib/utils';
import { Link, Stack } from 'expo-router';
import * as React from 'react';
import { View } from 'react-native';

export default function Index() {
  const auth = db.useAuth();

  const { data, isLoading } = db.useQuery({
    teams: {
      subjects: {},
      $: { where: { 'ui.user.id': auth.user!.id } },
    },
  });

  if (isLoading) {
    return <Loading />;
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Link asChild href="/new-subject">
              <Button size="icon" variant="link">
                <Plus className="color-foreground" size={24} />
              </Button>
            </Link>
          ),
          title: 'Subjects',
        }}
      />
      <View className="flex-1 gap-4 p-6">
        {data?.teams?.[0]?.subjects?.map((subject) => (
          <Link href={`./${subject.id}`} key={subject.id}>
            <View className="flex-row items-center justify-between gap-3">
              <Text className="text-3xl">{subject.name}</Text>
              <ChevronRight className="color-foreground" size={24} />
            </View>
          </Link>
        ))}
      </View>
    </>
  );
}
