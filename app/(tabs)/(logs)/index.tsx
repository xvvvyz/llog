import { LogDropdownMenu } from '@/components/log-dropdown-menu';
import { SearchBar } from '@/components/search-bar';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useActiveTeamId } from '@/hooks/use-active-team-id';
import { useBreakpoints } from '@/hooks/use-breakpoints';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Color, SPECTRUM } from '@/theme/spectrum';
import { cn } from '@/utilities/cn';
import { db } from '@/utilities/db';
import { id } from '@instantdb/react-native';
import { Link, useNavigation, useRouter } from 'expo-router';
import { Plus, Sparkles, Tag } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, View } from 'react-native';

export default function Index() {
  const [query, setQuery] = useState('');
  const auth = db.useAuth();
  const breakpoints = useBreakpoints();
  const colorScheme = useColorScheme();
  const navigation = useNavigation();
  const router = useRouter();
  const { teamId } = useActiveTeamId();

  const { data, isLoading } = db.useQuery(
    auth.user && teamId
      ? {
          teams: {
            $: { where: { 'ui.user.id': auth.user.id } },
            logs: {
              logTags: {},
            },
          },
          logTags: {
            $: { order: { order: 'asc' }, where: { team: teamId } },
          },
        }
      : null
  );

  const logs = useMemo(() => data?.teams?.[0]?.logs ?? [], [data]);
  const logTags = data?.logTags ?? [];
  const isSearchVisible = breakpoints.md && logs.length;

  const filtered = useMemo(
    () =>
      logs.filter((log) =>
        log.name.toLowerCase().includes(query.toLowerCase())
      ),
    [logs, query]
  );

  const columns = useMemo(() => {
    if (breakpoints['2xl']) return 6;
    if (breakpoints['xl']) return 5;
    if (breakpoints['lg']) return 4;
    if (breakpoints['md']) return 3;
    return 2;
  }, [breakpoints]);

  const newLog = useCallback(() => {
    const logId = id();

    db.transact(
      db.tx.logs[logId]
        .update({ color: 'indigo', name: 'New log' })
        .link({ team: teamId })
    );

    router.push(`/${logId}`);
  }, [router, teamId]);

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View className="flex-row items-center gap-2">
          {isSearchVisible && <SearchBar query={query} setQuery={setQuery} />}
          <Button
            accessibilityHint="Opens a form to create a new log"
            accessibilityLabel="New log"
            className="size-14"
            onPress={newLog}
            size="icon"
            variant="link"
          >
            <Icon aria-hidden className="text-foreground" icon={Plus} />
          </Button>
        </View>
      ),
    });
  }, [newLog, isSearchVisible, navigation, query]);

  if (isLoading) {
    return null;
  }

  if (!logs.length) {
    return (
      <View className="flex-1 items-center justify-center gap-6 py-8">
        <Icon
          aria-hidden
          className="-mb-2 text-primary"
          icon={Sparkles}
          size={64}
        />
        <Text className="text-center text-muted-foreground">
          &ldquo;Without data, you&rsquo;re just another{'\n'}person with an
          opinion.&rdquo;
        </Text>
        <Button
          accessibilityHint="Opens a form to create your first log"
          accessibilityLabel="Create your first log"
          onPress={newLog}
        >
          <Icon
            icon={Plus}
            className="-ml-0.5 text-white"
            size={20}
            aria-hidden
          />
          <Text>New log</Text>
        </Button>
      </View>
    );
  }

  return (
    <FlatList
      accessibilityLabel="Logs"
      accessibilityRole="list"
      ListHeaderComponent={
        !breakpoints.md ? (
          <View className="p-1.5 pb-3">
            <SearchBar query={query} setQuery={setQuery} />
          </View>
        ) : null
      }
      contentContainerClassName="p-2 md:p-6"
      data={filtered}
      key={`grid-${columns}`}
      keyExtractor={(item) => item.id}
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="always"
      numColumns={columns}
      renderItem={({ item }) => {
        const color = SPECTRUM[colorScheme][item.color as Color].default;

        return (
          <View
            accessibilityRole="none"
            className={cn('p-2', {
              'w-1/2': columns === 2,
              'w-1/3': columns === 3,
              'w-1/4': columns === 4,
              'w-1/5': columns === 5,
              'w-1/6': columns === 6,
            })}
          >
            <Link asChild href={`/${item.id}`} key={item.id}>
              <Button
                accessibilityHint={`Opens the log ${item.name}`}
                accessibilityLabel={`Open ${item.name}`}
                className="flex h-28 w-full flex-col items-start justify-between rounded-2xl p-4 active:opacity-90 web:transition-opacity web:hover:opacity-90"
                ripple="default"
                style={{ backgroundColor: color }}
                variant="ghost"
              >
                <Text
                  className="-mt-1 pr-8 font-medium leading-tight text-white"
                  numberOfLines={1}
                >
                  {item.name}
                </Text>
                {!!item.logTags?.length && (
                  <View className="max-h-11 flex-row flex-wrap gap-1 overflow-hidden">
                    {logTags
                      .filter((logTag) =>
                        item.logTags.some(
                          (itemLogTag) => itemLogTag.id === logTag.id
                        )
                      )
                      .map((tag) => (
                        <View
                          key={tag.id}
                          className="h-5 flex-row items-center gap-1 rounded-full bg-white/15 px-1.5"
                        >
                          <Icon
                            aria-hidden
                            className="text-white"
                            icon={Tag}
                            size={12}
                          />
                          <Text
                            className="text-xs font-normal text-white"
                            numberOfLines={1}
                          >
                            {tag.name}
                          </Text>
                        </View>
                      ))}
                  </View>
                )}
              </Button>
            </Link>
            <View className="absolute right-0.5 top-0.5">
              <LogDropdownMenu logId={item.id} logName={item.name} />
            </View>
          </View>
        );
      }}
      showsVerticalScrollIndicator={false}
    />
  );
}
