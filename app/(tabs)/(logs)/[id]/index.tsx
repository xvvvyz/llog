import { LogDropdownMenu } from '@/components/log-dropdown-menu';
import { RecordCreateForm } from '@/components/record-create-form';
import { RecordListHeader } from '@/components/record-list-header';
import { BackButton } from '@/components/ui/back-button';
import { List } from '@/components/ui/list';
import { Text } from '@/components/ui/text';
import { Title } from '@/components/ui/title';
import { useSheetManager } from '@/context/sheet-manager';
import { useHeaderHeight } from '@/hooks/use-header-height';
import { useLog } from '@/queries/use-log';
import { useProfile } from '@/queries/use-profile';
import { useRecords } from '@/queries/use-records';
import { formatDate } from '@/utilities/time';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Fragment, ReactElement, useMemo, useRef } from 'react';
import { View } from 'react-native';

export default function Index() {
  const headerHeight = useHeaderHeight();
  const params = useLocalSearchParams<{ id: string }>();
  const profile = useProfile();
  const renderCacheRef = useRef<ReactElement | null>(null);
  const sheetManager = useSheetManager();

  const log = useLog({ id: params.id });
  const records = useRecords({ logId: params.id });

  const placeholder = useMemo(
    () => `What's on your mind, ${profile.name?.split(' ')[0]}?`,
    [profile.name]
  );

  if (sheetManager.someOpen()) {
    return renderCacheRef.current;
  }

  renderCacheRef.current = (
    <Fragment>
      <Stack.Screen
        options={{
          headerLeft: () => <BackButton />,
          headerRight: () => (
            <LogDropdownMenu
              headerHeight={headerHeight}
              id={log.id}
              name={log.name}
              variant="header"
            />
          ),
          headerTitle: () => <Title>{log.name}</Title>,
        }}
      />
      <List
        ListEmptyComponent={
          <RecordCreateForm
            className="mt-3 md:mt-8"
            logId={params.id}
            placeholder={placeholder}
          />
        }
        ListHeaderComponent={
          records.data.length ? (
            <RecordListHeader logId={params.id} placeholder={placeholder} />
          ) : null
        }
        accessibilityLabel={`${log.name} records`}
        accessibilityRole="list"
        contentContainerClassName="mx-auto w-full max-w-lg p-3 pt-0 md:p-8 md:pt-0"
        data={records.data}
        keyExtractor={(record) => record.id}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="always"
        renderItem={({ item: record }) => (
          <View
            className="mt-3 gap-3 rounded-2xl border border-border bg-card p-4"
            style={{ borderCurve: 'continuous' }}
          >
            <View className="flex-row items-center gap-3">
              <View className="h-11 w-11 rounded-full border border-border bg-secondary" />
              <View className="-mt-1">
                <Text className="font-medium">{record.author?.name}</Text>
                <Text className="text-sm leading-4 text-muted-foreground">
                  {formatDate(record.date)}
                </Text>
              </View>
            </View>
            <Text className="-mb-1" numberOfLines={7}>
              {record.text}
            </Text>
          </View>
        )}
      />
    </Fragment>
  );

  return renderCacheRef.current;
}
