import { ChevronRight } from '@/components/icons/chevron-right';
import { Text } from '@/components/text';
import { db } from '@/utilities/db';
import { Link } from 'expo-router';
import * as React from 'react';
import { View } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';

export default function Index() {
  const auth = db.useAuth();

  const { data } = db.useQuery(
    auth.user
      ? {
          teams: {
            logs: {},
            $: { where: { 'ui.user.id': auth.user.id } },
          },
        }
      : null
  );

  return (
    <Animated.FlatList
      className="p-4"
      contentContainerClassName="gap-4"
      data={data?.teams?.[0]?.logs}
      itemLayoutAnimation={LinearTransition}
      keyExtractor={(item) => item.id}
      keyboardDismissMode="on-drag"
      renderItem={({ item }) => (
        <Link className="pr-2" href={`/${item.id}`}>
          <View className="flex-row items-center justify-between gap-2">
            <Text className="flex-shrink text-3xl">{item.name}</Text>
            <ChevronRight className="shrink-0 color-foreground" />
          </View>
        </Link>
      )}
    />
  );
}
