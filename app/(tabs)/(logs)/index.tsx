import { Plus } from '@/components/icons/plus';
import { Search } from '@/components/icons/search';
import { Sparkles } from '@/components/icons/sparkles';
import { X } from '@/components/icons/x';
import { LogDropdownMenu } from '@/components/log-dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { useBreakpoints } from '@/hooks/use-breakpoints';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Color, SPECTRUM } from '@/theme/spectrum';
import { cn } from '@/utilities/cn';
import { db } from '@/utilities/db';
import { Link, useNavigation } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, View } from 'react-native';

const SearchBar = ({
  query,
  setQuery,
}: {
  query: string;
  setQuery: (query: string) => void;
}) => (
  <View className="relative md:mr-2">
    <View className="absolute left-3 top-1/2 -translate-y-1/2">
      <Search className="text-placeholder" size={20} aria-hidden />
    </View>
    <Input
      accessibilityHint="Type to filter your logs"
      accessibilityLabel="Search logs"
      autoCapitalize="none"
      autoComplete="off"
      className="px-10 md:h-10 md:w-56"
      onChangeText={setQuery}
      placeholder="Search"
      returnKeyType="done"
      value={query}
    />
    {!!query.length && (
      <View className="absolute right-1.5 top-1/2 -translate-y-1/2 md:right-1">
        <Button
          accessibilityHint="Clears the search input"
          accessibilityLabel="Clear search"
          className="size-8 rounded-full"
          onPress={() => setQuery('')}
          size="icon"
          variant="ghost"
        >
          <X className="text-muted-foreground" size={16} aria-hidden />
        </Button>
      </View>
    )}
  </View>
);

export default function Index() {
  const [query, setQuery] = useState('');
  const auth = db.useAuth();
  const breakpoints = useBreakpoints();
  const colorScheme = useColorScheme();
  const navigation = useNavigation();

  const { data, isLoading } = db.useQuery(
    auth.user
      ? {
          teams: {
            $: { where: { 'ui.user.id': auth.user.id } },
            logs: {},
          },
        }
      : null
  );

  const logs = useMemo(() => data?.teams?.[0]?.logs ?? [], [data]);

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

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View className="flex-row items-center gap-2">
          {breakpoints.md && logs.length && (
            <SearchBar query={query} setQuery={setQuery} />
          )}
          <Link asChild href="/new">
            <Button
              accessibilityHint="Opens a form to create a new log"
              accessibilityLabel="New log"
              className="size-14"
              size="icon"
              variant="link"
            >
              <Plus aria-hidden className="color-foreground" />
            </Button>
          </Link>
        </View>
      ),
    });
  }, [breakpoints.md, logs.length, navigation, query]);

  if (isLoading) {
    return null;
  }

  if (!logs.length) {
    return (
      <View className="flex-1 items-center justify-center gap-6 py-8">
        <Sparkles className="-mb-2 stroke-primary" size={64} aria-hidden />
        <Text className="text-center text-muted-foreground">
          &ldquo;Without data, you&rsquo;re just another{'\n'}person with an
          opinion.&rdquo;
        </Text>
        <Link asChild href="/new">
          <Button
            accessibilityHint="Opens a form to create your first log"
            accessibilityLabel="Create your first log"
          >
            <Plus className="-ml-0.5 text-white" size={20} aria-hidden />
            <Text>New log</Text>
          </Button>
        </Link>
      </View>
    );
  }

  return (
    <FlatList
      accessibilityLabel="Logs grid"
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
                className="h-28 items-end justify-start rounded-2xl px-4 py-3 active:opacity-90 web:transition-opacity web:hover:opacity-90"
                ripple="default"
                style={{
                  backgroundColor:
                    SPECTRUM[colorScheme][item.color as Color].default,
                }}
                variant="ghost"
              >
                <Text
                  className="font-medium leading-tight text-white"
                  numberOfLines={1}
                >
                  {item.name}
                </Text>
              </Button>
            </Link>
            <View className="absolute right-1.5 top-1.5">
              <LogDropdownMenu logId={item.id} logName={item.name} />
            </View>
          </View>
        );
      }}
      showsVerticalScrollIndicator={false}
    />
  );
}
