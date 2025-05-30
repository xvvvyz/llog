import { LogDropdownMenu } from '@/components/log-dropdown-menu';
import { BackButton } from '@/components/ui/back-button';
import { Title } from '@/components/ui/title';
import { useHeaderHeight } from '@/hooks/use-header-height';
import { db } from '@/utilities/db';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Fragment } from 'react';

export default function Index() {
  const headerHeight = useHeaderHeight();
  const params = useLocalSearchParams<{ id: string }>();

  const { data } = db.useQuery({ logs: { $: { where: { id: params.id } } } });

  const log = data?.logs?.[0];

  return (
    <Fragment>
      <Stack.Screen
        options={{
          headerLeft: () => <BackButton />,
          headerRight: () => (
            <LogDropdownMenu
              headerHeight={headerHeight}
              id={log?.id}
              name={log?.name}
              variant="header"
            />
          ),
          headerTitle: () => <Title>{log?.name}</Title>,
        }}
      />
    </Fragment>
  );
}
