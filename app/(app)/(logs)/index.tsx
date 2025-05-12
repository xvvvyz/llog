import { HeaderTitle } from '@/components/header-title';
import { Plus } from '@/components/icons/plus';
import { Search } from '@/components/icons/search';
import { X } from '@/components/icons/x';
import { LogForm } from '@/components/log-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SheetModal } from '@/components/ui/sheet-modal';
import { Text } from '@/components/ui/text';
import { db } from '@/utilities/db';
import { Link, useNavigation } from 'expo-router';
import * as React from 'react';
import { View } from 'react-native';
import { FlatList } from 'react-native-gesture-handler';

export default function Index() {
  const [query, setQuery] = React.useState('');
  const [isCreateSheetOpen, setIsCreateSheetOpen] = React.useState(false);
  const auth = db.useAuth();
  const navigation = useNavigation();

  const { data } = db.useQuery(
    auth.user
      ? {
          teams: {
            logs: {},
            $: { where: { 'ui.user.id': auth.user.id } },
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

  React.useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Button
          className="web:mr-2"
          size="icon"
          variant="link"
          onPress={() => setIsCreateSheetOpen(true)}
        >
          <Plus className="color-foreground" />
        </Button>
      ),
      headerTitle: () => <HeaderTitle>Logs</HeaderTitle>,
    });
  }, [navigation]);

  return (
    <>
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
              <View
                className="overflow-hidden rounded-2xl bg-card hover:opacity-90 active:opacity-90"
                style={{ borderCurve: 'continuous' }}
              >
                <View
                  className="h-32 p-4"
                  style={{ backgroundColor: item.color ?? '' }}
                >
                  <Text
                    className="text-lg font-medium leading-tight text-white"
                    numberOfLines={2}
                  >
                    {item.name}
                  </Text>
                </View>
              </View>
            </Link>
          </View>
        )}
        showsVerticalScrollIndicator={false}
      />
      <SheetModal open={isCreateSheetOpen} onOpenChange={setIsCreateSheetOpen}>
        <LogForm onSuccess={() => setIsCreateSheetOpen(false)} />
      </SheetModal>
    </>
  );
}
