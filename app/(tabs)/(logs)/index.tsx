import { LogDropdownMenu } from '@/components/log-dropdown-menu';
import { LogDropdownMenuForms } from '@/components/log-dropdown-menu-forms';
import { LogListEmptyState } from '@/components/log-list-empty-state';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { SearchInput } from '@/components/ui/search-input';
import { Text } from '@/components/ui/text';
import { useActiveTeamId } from '@/hooks/use-active-team-id';
import { useGridColumns as useBreakpointColumns } from '@/hooks/use-breakpoint-columns';
import { useBreakpoints } from '@/hooks/use-breakpoints';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useLogDropdownMenuForms } from '@/hooks/use-log-dropdown-menu-forms';
import { Log, LogTag } from '@/instant.schema';
import { Color, SPECTRUM } from '@/theme/spectrum';
import { cn } from '@/utilities/cn';
import { db } from '@/utilities/db';
import { id } from '@instantdb/react-native';
import { Link, useNavigation, useRouter } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, View } from 'react-native';

export default function Index() {
  const [query, setQuery] = useState('');
  const auth = db.useAuth();
  const breakpoints = useBreakpoints();
  const colorScheme = useColorScheme();
  const columns = useBreakpointColumns([2, 2, 3, 3, 4, 5, 6]);
  const dropdownMenuForms = useLogDropdownMenuForms();
  const navigation = useNavigation();
  const router = useRouter();
  const { teamId } = useActiveTeamId();

  const { data: logsData, isLoading: isLogsLoading } = db.useQuery(
    auth.user
      ? {
          teams: {
            $: { where: { 'ui.user.id': auth.user.id } },
            logs: { logTags: { $: { fields: ['id'] } } },
          },
        }
      : null
  );

  const { data: logTagsData } = db.useQuery(
    teamId ? { logTags: { $: { where: { team: teamId } } } } : null
  );

  const logs = useMemo(
    () => logsData?.teams?.[0]?.logs ?? [],
    [logsData?.teams]
  );

  const logTags = useMemo(
    // https://discord.com/channels/1031957483243188235/1148284450992574535/threads/1376250736416919567/
    () => logTagsData?.logTags?.sort((a, b) => a.order - b.order) ?? [],
    [logTagsData?.logTags]
  );

  const filteredLogs = useMemo(
    () =>
      logs.filter((log) =>
        log.name.toLowerCase().includes(query.toLowerCase())
      ),
    [logs, query]
  );

  const createLog = useCallback(() => {
    const logId = id();

    db.transact(
      db.tx.logs[logId]
        .update({ color: 'indigo', name: 'New log' })
        .link({ team: teamId })
    );

    router.push(`/${logId}`);
  }, [router, teamId]);

  const ListHeaderComponent = useCallback(
    () =>
      !breakpoints.md ? (
        <View className="p-1.5">
          <SearchInput query={query} setQuery={setQuery} />
        </View>
      ) : null,
    [breakpoints.md, query]
  );

  const renderLog = useCallback(
    ({ item }: { item: Log & { logTags: Pick<LogTag, 'id'>[] } }) => {
      const color = SPECTRUM[colorScheme][item.color as Color];

      return (
        <View
          accessibilityRole="none"
          className={cn(
            'p-1.5 web:transition-opacity web:hover:opacity-90 md:p-2',
            {
              'w-1/1': columns === 1,
              'w-1/2': columns === 2,
              'w-1/3': columns === 3,
              'w-1/4': columns === 4,
              'w-1/5': columns === 5,
              'w-1/6': columns === 6,
            }
          )}
        >
          <Link asChild href={`/${item.id}`} key={item.id}>
            <Button
              accessibilityHint={`Opens the log ${item.name}`}
              accessibilityLabel={`Open ${item.name}`}
              className="flex h-28 w-full flex-col items-start justify-between p-4 active:opacity-90"
              ripple="default"
              style={{ backgroundColor: color.default }}
              variant="ghost"
              wrapperClassName="rounded-2xl"
            >
              <View className="max-h-11 flex-row flex-wrap gap-1 overflow-hidden pr-10">
                {logTags
                  .filter((logTag) =>
                    item.logTags.some(
                      (itemLogTag) => itemLogTag.id === logTag.id
                    )
                  )
                  .map((tag) => (
                    <View
                      key={tag.id}
                      className="rounded bg-black/10 px-1.5 py-0.5"
                    >
                      <Text className="text-xs text-white/80" numberOfLines={1}>
                        {tag.name}
                      </Text>
                    </View>
                  ))}
              </View>
              <Text className="-mb-1.5 text-white" numberOfLines={1}>
                {item.name}
              </Text>
            </Button>
          </Link>
          <View className="absolute right-1 top-1 md:right-1.5 md:top-1.5">
            <LogDropdownMenu
              logId={item.id}
              logName={item.name}
              setLogDeleteFormId={dropdownMenuForms.setLogDeleteFormId}
              setLogEditFormId={dropdownMenuForms.setLogEditFormId}
              setLogTagsFromId={dropdownMenuForms.setLogTagsFromId}
            />
          </View>
        </View>
      );
    },
    [colorScheme, columns, dropdownMenuForms, logTags]
  );

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View className="flex-row items-center gap-2">
          {!!logs.length && breakpoints.md && (
            <SearchInput
              query={query}
              setQuery={setQuery}
              wrapperClassName="mr-2 w-52"
            />
          )}
          <Button
            accessibilityHint="Opens a form to create a new log"
            accessibilityLabel="New log"
            className="size-14"
            onPress={createLog}
            size="icon"
            variant="link"
          >
            <Icon aria-hidden className="text-foreground" icon={Plus} />
          </Button>
        </View>
      ),
    });
  }, [breakpoints.md, logs.length, createLog, navigation, query]);

  if (isLogsLoading) {
    return null;
  }

  if (!logs.length) {
    return <LogListEmptyState createLog={createLog} />;
  }

  return (
    <FlatList
      ListFooterComponent={<LogDropdownMenuForms {...dropdownMenuForms} />}
      ListHeaderComponent={ListHeaderComponent}
      accessibilityLabel="Logs"
      accessibilityRole="list"
      contentContainerClassName="p-1.5 md:p-6"
      data={filteredLogs}
      key={`grid-${columns}`}
      keyExtractor={(item) => item.id}
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="always"
      numColumns={columns}
      renderItem={renderLog}
      showsVerticalScrollIndicator={false}
    />
  );
}
