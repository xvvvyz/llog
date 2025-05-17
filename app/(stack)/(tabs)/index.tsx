import { MoreHorizontal } from '@/components/icons/more-horizontal';
import { Pencil } from '@/components/icons/pencil';
import { Search } from '@/components/icons/search';
import { Trash } from '@/components/icons/trash';
import { X } from '@/components/icons/x';
import { Button } from '@/components/ui/button';
import * as Menu from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Color, SPECTRUM } from '@/theme/spectrum';
import { db } from '@/utilities/db';
import { Link } from 'expo-router';
import * as React from 'react';
import { FlatList, View } from 'react-native';

export default function Index() {
  const [query, setQuery] = React.useState('');
  const auth = db.useAuth();
  const colorScheme = useColorScheme();

  const { data } = db.useQuery(
    auth.user
      ? {
          teams: {
            $: { where: { 'ui.user.id': auth.user.id } },
            logs: {},
          },
        }
      : null
  );

  const filtered = React.useMemo(
    () =>
      (data?.teams?.[0]?.logs ?? []).filter((log) =>
        log.name.toLowerCase().includes(query.toLowerCase())
      ),
    [data?.teams, query]
  );

  return (
    <FlatList
      ListHeaderComponent={
        <View className="p-1.5 pb-3">
          <View className="relative">
            <View className="absolute left-3 top-1/2 -translate-y-1/2">
              <Search className="color-placeholder" size={20} />
            </View>
            <Input
              autoCapitalize="none"
              autoComplete="off"
              className="pl-11 pr-11 text-lg"
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
                  <X className="color-muted-foreground" size={16} />
                </Button>
              </View>
            )}
          </View>
        </View>
      }
      contentContainerClassName="p-2.5"
      data={filtered}
      keyExtractor={(item) => item.id}
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="always"
      numColumns={2}
      renderItem={({ item }) => {
        return (
          <View className="w-1/2 p-1.5">
            <Link asChild href={`/${item.id}`}>
              <View
                className="h-32 overflow-hidden rounded-2xl active:opacity-90 web:transition-opacity web:hover:opacity-90"
                style={{
                  backgroundColor:
                    SPECTRUM[colorScheme][item.color as Color].default,
                  borderCurve: 'continuous',
                }}
              >
                <View className="flex-1 items-start justify-end p-4">
                  <Text
                    className="z-10 text-lg font-medium leading-tight text-white"
                    numberOfLines={2}
                  >
                    {item.name}
                  </Text>
                </View>
                <View className="absolute right-0 top-0">
                  <Menu.Root>
                    <Menu.Trigger asChild>
                      <Button
                        className="group size-12"
                        size="icon"
                        variant="link"
                      >
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
            </Link>
          </View>
        );
      }}
      showsVerticalScrollIndicator={false}
    />
  );
}
