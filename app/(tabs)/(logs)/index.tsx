import { MoreHorizontal } from '@/components/icons/more-horizontal';
import { Pencil } from '@/components/icons/pencil';
import { Plus } from '@/components/icons/plus';
import { Search } from '@/components/icons/search';
import { Sparkles } from '@/components/icons/sparkles';
import { Trash } from '@/components/icons/trash';
import { X } from '@/components/icons/x';
import { Button } from '@/components/ui/button';
import * as Menu from '@/components/ui/dropdown-menu';
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
      <Search className="text-placeholder" size={20} />
    </View>
    <Input
      autoCapitalize="none"
      autoComplete="off"
      className="pl-11 pr-11 md:h-10 md:w-56"
      onChangeText={setQuery}
      placeholder="Search"
      returnKeyType="done"
      value={query}
    />
    {!!query.length && (
      <View className="absolute right-1 top-1/2 -translate-y-1/2">
        <Button
          size="icon"
          variant="ghost"
          className="rounded-full"
          onPress={() => setQuery('')}
        >
          <X className="text-muted-foreground" size={16} />
        </Button>
      </View>
    )}
  </View>
);

export default function Index() {
  const [query, setQuery] = useState('');
  const auth = db.useAuth();
  const colorScheme = useColorScheme();
  const navigation = useNavigation();
  const breakpoints = useBreakpoints();

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
          {breakpoints.md && <SearchBar query={query} setQuery={setQuery} />}
          <Link asChild href="/new">
            <Button
              className="size-12"
              wrapperClassName="web:mr-4"
              size="icon"
              variant="link"
            >
              <Plus className="color-foreground" />
            </Button>
          </Link>
        </View>
      ),
    });
  }, [breakpoints.md, query, navigation]);

  if (isLoading) {
    return null;
  }

  if (!logs.length) {
    return (
      <View className="flex-1 items-center justify-center gap-6 py-8">
        <Sparkles className="-mb-2 stroke-primary" size={64} />
        <Text className="text-center text-placeholder">
          &ldquo;Without data, you&rsquo;re just another{'\n'}person with an
          opinion.&rdquo;
        </Text>
        <Link asChild href="/new">
          <Button>
            <Plus className="-ml-0.5 text-white" size={20} />
            <Text>New log</Text>
          </Button>
        </Link>
      </View>
    );
  }

  return (
    <FlatList
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
                className="h-28 items-end justify-start overflow-hidden rounded-2xl px-4 py-3 active:opacity-90 web:transition-opacity web:hover:opacity-90"
                ripple="default"
                style={{
                  backgroundColor:
                    SPECTRUM[colorScheme][item.color as Color].default,
                }}
                variant="ghost"
              >
                <Text
                  className="z-10 font-medium leading-tight text-white group-active:text-white"
                  numberOfLines={2}
                >
                  {item.name}
                </Text>
              </Button>
            </Link>
            <View className="absolute right-1.5 top-1.5">
              <Menu.Root>
                <Menu.Trigger asChild>
                  <Button className="group size-12" size="icon" variant="link">
                    <View className="size-8 items-center justify-center rounded-full bg-white/15 group-active:bg-white/25 web:transition-colors web:group-hover:bg-white/25">
                      <MoreHorizontal className="text-white" size={20} />
                    </View>
                  </Button>
                </Menu.Trigger>
                <Menu.Content align="end" className="mr-2">
                  <Link asChild href={`/${item.id}/edit`}>
                    <Menu.Item>
                      <Pencil className="text-placeholder" size={20} />
                      <Text>Edit</Text>
                    </Menu.Item>
                  </Link>
                  <Link asChild href={`/${item.id}/delete`}>
                    <Menu.Item>
                      <Trash className="text-placeholder" size={20} />
                      <Text>Delete</Text>
                    </Menu.Item>
                  </Link>
                </Menu.Content>
              </Menu.Root>
            </View>
          </View>
        );
      }}
      showsVerticalScrollIndicator={false}
    />
  );
}
