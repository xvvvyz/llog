import { LogListActions } from '@/components/log-list-actions';
import { LogListEmptyState } from '@/components/log-list-empty-state';
import { LogListItem } from '@/components/log-list-item';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/ui/header';
import { Icon } from '@/components/ui/icon';
import { List } from '@/components/ui/list';
import { Loading } from '@/components/ui/loading';
import { useSheetManager } from '@/context/sheet-manager';
import { useGridColumns as useBreakpointColumns } from '@/hooks/use-breakpoint-columns';
import { useBreakpoints } from '@/hooks/use-breakpoints';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { createLog } from '@/mutations/create-log';
import { useHasNoLogs } from '@/queries/use-has-no-logs';
import { useLogTags } from '@/queries/use-log-tags';
import { useLogs } from '@/queries/use-logs';
import { SPECTRUM } from '@/theme/spectrum';
import { cn } from '@/utilities/ui/utils';
import { id } from '@instantdb/react-native';
import { router } from 'expo-router';
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
      <Header
        right={
          <View className="flex-row items-center">
            {breakpoints.md && !isEmpty && (
              <LogListActions
                className={cn(isEmpty && 'md:hidden')}
                logTags={logTags.data}
                query={rawQuery}
                setQuery={setRawQuery}
              />
            )}
            <Button
              className="size-11"
              onPress={() => {
                const logId = id();
                createLog({ color: 7, id: logId, name: 'Log' });
                router.push(`/${logId}`);
              }}
              size="icon"
              variant="link"
              wrapperClassName="md:-mr-4 md:ml-4"
            >
              <Icon className="text-foreground" icon={Plus} />
            </Button>
          </View>
        }
        title="Logs"
      />
      {logs.isLoading ? (
        <Loading />
      ) : isEmpty ? (
        <LogListEmptyState />
      ) : (
        <List
          ListHeaderComponent={
            !breakpoints.md && !isEmpty ? (
              <LogListActions
                className="p-1.5 pt-4 md:p-2"
                logTags={logTags.data}
                query={rawQuery}
                setQuery={setRawQuery}
              />
            ) : null
          }
          contentContainerClassName="p-2.5 pt-0 md:p-6"
          data={logs.data}
          estimatedItemSize={112}
          key={`grid-${columns}`}
          keyExtractor={(item) => item.id}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="always"
          numColumns={columns}
          renderItem={({ item }) => {
            const color =
              SPECTRUM[colorScheme][item.color] ?? SPECTRUM[colorScheme][0];

            const itemLogTagIds = new Set(item.logTags.map((tag) => tag.id));

            return (
              <LogListItem
                className="p-1.5 md:p-2"
                color={color.default}
                id={item.id}
                name={item.name}
                tags={logTags.data.filter((tag) => itemLogTagIds.has(tag.id))}
              />
            );
          }}
        />
      )}
    </Fragment>
  );

  return renderCacheRef.current;
}
