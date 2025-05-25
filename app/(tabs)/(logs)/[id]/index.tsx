import { LogDropdownMenu } from '@/components/log-dropdown-menu';
import { Title } from '@/components/ui/title';
import { useHeaderHeight } from '@/hooks/use-header-height';
import { db } from '@/utilities/db';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { useEffect } from 'react';

export default function Index() {
  const headerHeight = useHeaderHeight();
  const navigation = useNavigation();
  const params = useLocalSearchParams<{ id: string }>();

  const { data } = db.useQuery({
    logs: {
      $: { where: { id: params.id } },
      entries: {},
    },
  });

  const log = data?.logs?.[0];
  const name = log?.name ?? '';

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <LogDropdownMenu
          headerHeight={headerHeight}
          logId={params.id}
          logName={name}
          variant="header"
        />
      ),
      headerTitle: () => <Title>{name}</Title>,
    });
  }, [headerHeight, name, navigation, params.id]);

  if (!log) return null;

  return null;
}
