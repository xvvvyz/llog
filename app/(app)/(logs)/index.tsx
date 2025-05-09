import { ChevronRight } from '@/components/icons/chevron-right';
import { Text } from '@/components/ui/text';
import { db } from '@/lib/utils';
import { Link } from 'expo-router';
import * as React from 'react';
import { View } from 'react-native';

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
    <View className="flex-1 gap-4 p-6">
      {data?.teams?.[0]?.logs?.map((log: { id: string; name: string }) => (
        <Link href={`/${log.id}`} key={log.id}>
          <View className="flex-row items-center justify-between gap-3">
            <Text className="text-3xl">{log.name}</Text>
            <ChevronRight className="color-foreground" size={24} />
          </View>
        </Link>
      ))}
    </View>
  );
}
