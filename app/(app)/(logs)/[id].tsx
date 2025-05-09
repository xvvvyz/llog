import { db } from '@/lib/utils';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import * as React from 'react';

export default function Log() {
  const navigation = useNavigation();
  const searchParams = useLocalSearchParams();

  const id = searchParams.id as string;

  const { data } = db.useQuery({
    logs: {
      records: {},
      $: { where: { id } },
    },
  });

  React.useEffect(
    () => navigation.setOptions({ headerTitle: data?.logs?.[0]?.name ?? '' }),
    [data, navigation]
  );

  return null;
}
