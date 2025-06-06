import { LogDropdownMenu } from '@/components/log-dropdown-menu';
import { RecordListHeader } from '@/components/record-list-header';
import { Avatar } from '@/components/ui/avatar';
import { BackButton } from '@/components/ui/back-button';
import { List } from '@/components/ui/list';
import { Loading } from '@/components/ui/loading';
import { Text } from '@/components/ui/text';
import { Title } from '@/components/ui/title';
import { useSheetManager } from '@/context/sheet-manager';
import { useHeaderHeight } from '@/hooks/use-header-height';
import { useLog } from '@/queries/use-log';
import { useRecords } from '@/queries/use-records';
import { formatDate } from '@/utilities/time';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Fragment, ReactElement, useRef } from 'react';
import { View } from 'react-native';

export default function Index() {
  const headerHeight = useHeaderHeight();
  const params = useLocalSearchParams<{ id: string }>();
  const renderCacheRef = useRef<ReactElement | null>(null);
  const sheetManager = useSheetManager();

  const log = useLog({ id: params.id });
  const records = useRecords({ logId: params.id });

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
      {records.isLoading ? (
        <Loading />
      ) : (
        <List
          ListEmptyComponent={<RecordListHeader logId={params.id} />}
          ListHeaderComponent={
            records.data.length ? <RecordListHeader logId={params.id} /> : null
          }
          contentContainerClassName="mx-auto w-full max-w-lg p-3 pt-0 md:p-8 md:pt-0"
          data={records.data}
          keyExtractor={(record) => record.id}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="always"
          renderItem={({ item: record }) => (
            <View
              className="mt-3 gap-3 rounded-2xl border border-border-secondary bg-card p-4"
              style={{ borderCurve: 'continuous' }}
            >
              <View className="flex-row items-center gap-3">
                <Avatar avatar={record.author?.avatar} id={record.author?.id} />
                <View>
                  <Text className="font-medium leading-5">
                    {record.author?.name}
                  </Text>
                  <Text className="text-sm leading-5 text-muted-foreground">
                    {formatDate(record.date)}
                  </Text>
                </View>
              </View>
              <Text className="-mb-1 select-text" numberOfLines={7}>
                {record.text}
              </Text>
            </View>
          )}
        />
      )}
    </Fragment>
  );

  return renderCacheRef.current;
}
