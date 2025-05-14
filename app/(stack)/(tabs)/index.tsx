import { Search } from '@/components/icons/search';
import { X } from '@/components/icons/x';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { db } from '@/utilities/db';
import { LinearGradient } from 'expo-linear-gradient';
import { Link } from 'expo-router';
import * as React from 'react';
import { FlatList, StyleSheet } from 'react-native';

export default function Index() {
  const [query, setQuery] = React.useState('');
  const auth = db.useAuth();

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
              <Search className="color-muted-foreground" size={20} />
            </View>
            <Input
              autoCapitalize="none"
              autoComplete="off"
              className="pl-11 pr-11"
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
      renderItem={({ item }) => (
        <View className="w-1/2 p-1.5">
          <Link asChild href={`/${item.id}`} className="group">
            <View className="overflow-hidden rounded-2xl bg-card hover:opacity-90 active:opacity-90">
              <View className="h-32" style={{ backgroundColor: item.color }}>
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.2)']}
                  end={{ x: 0.5, y: 1 }}
                  start={{ x: 0.5, y: 0 }}
                  style={StyleSheet.absoluteFill}
                />
                <View className="flex-1 items-start justify-end p-4">
                  <Text
                    className="z-10 text-lg font-medium leading-tight text-white"
                    numberOfLines={2}
                  >
                    {item.name}
                  </Text>
                </View>
              </View>
            </View>
          </Link>
        </View>
      )}
      showsVerticalScrollIndicator={false}
    />
  );
}
