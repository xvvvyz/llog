import { LogListActions } from '@/components/log-list-actions';
import { LogListEmptyState } from '@/components/log-list-empty-state';
import { LogListLog } from '@/components/log-list-log';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { List } from '@/components/ui/list';
import { Title } from '@/components/ui/title';
import { useSheetManager } from '@/context/sheet-manager';
import { useGridColumns as useBreakpointColumns } from '@/hooks/use-breakpoint-columns';
import { useBreakpoints } from '@/hooks/use-breakpoints';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { createLog } from '@/mutations/create-log';
import { useHasNoLogs } from '@/queries/use-has-no-logs';
import { useLogTags } from '@/queries/use-log-tags';
import { useLogs } from '@/queries/use-logs';
import { SPECTRUM } from '@/theme/spectrum';
import { cn } from '@/utilities/cn';
import { router, Stack } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { Fragment, ReactElement, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';

export default function Index() {
  const [rawQuery, setRawQuery] = useState('');
  const breakpoints = useBreakpoints();
  const colorScheme = useColorScheme();
  const columns = useBreakpointColumns([2, 2, 3, 3, 4, 5, 6]);
  const isEmpty = useHasNoLogs();
  const logTags = useLogTags();
  const renderCacheRef = useRef<ReactElement | null>(null);
  const sheetManager = useSheetManager();

  const query = useMemo(() => rawQuery?.trim(), [rawQuery]);
  const logs = useLogs({ query });

  if (sheetManager.someOpen()) {
    return renderCacheRef.current;
  }

  renderCacheRef.current = (
    <Fragment>
      <Stack.Screen
        options={{
          headerLeft: () =>
            breakpoints.md ? null : <View className="size-14" />,
          headerRight: () => (
            <View className="flex-row items-center gap-4">
              <LogListActions
                className={cn('hidden md:flex', isEmpty && 'md:hidden')}
                logTags={logTags.data}
                query={rawQuery}
                setQuery={setRawQuery}
              />
              <Button
                accessibilityHint="Opens a form to create a new log"
                accessibilityLabel="New log"
                className="size-14"
                onPress={async () => router.push(`/${await createLog()}`)}
                size="icon"
                variant="link"
              >
                <Icon aria-hidden className="text-foreground" icon={Plus} />
              </Button>
            </View>
          ),
          headerTitle: () => <Title>Logs</Title>,
        }}
      />
      {isEmpty ? (
        <LogListEmptyState />
      ) : (
        <List
          ListHeaderComponent={
            <LogListActions
              className="mb-3 p-1.5 md:hidden"
              logTags={logTags.data}
              query={rawQuery}
              setQuery={setRawQuery}
            />
          }
          accessibilityLabel="Logs"
          accessibilityRole="list"
          contentContainerClassName="p-1.5 md:p-6"
          data={logs.data}
          estimatedItemSize={112}
          key={`grid-${columns}`}
          keyExtractor={(item) => item.id}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="always"
          numColumns={columns}
          renderItem={({ item: log }) => {
            const color =
              SPECTRUM[colorScheme][log.color] ?? SPECTRUM[colorScheme][0];

            const itemLogTagIds = new Set(log.logTags.map((tag) => tag.id));

            return (
              <LogListLog
                color={color.default}
                id={log.id}
                name={log.name}
                tags={logTags.data.filter((tag) => itemLogTagIds.has(tag.id))}
              />
            );
          }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </Fragment>
  );

  return renderCacheRef.current;
}
