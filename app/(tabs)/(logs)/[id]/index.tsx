import { LogDropdownMenu } from '@/components/log-dropdown-menu';
import { LogEmptyState } from '@/components/log-empty-state';
import { Avatar } from '@/components/ui/avatar';
import { BackButton } from '@/components/ui/back-button';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { List } from '@/components/ui/list';
import { Loading } from '@/components/ui/loading';
import { Text } from '@/components/ui/text';
import { Title } from '@/components/ui/title';
import { useSheetManager } from '@/context/sheet-manager';
import { useHeaderHeight } from '@/hooks/use-header-height';
import { useLogColor } from '@/hooks/use-log-color';
import { useLog } from '@/queries/use-log';
import { useRecords } from '@/queries/use-records';
import { formatDate } from '@/utilities/ui/time';
import { Stack, useLocalSearchParams } from 'expo-router';
import { PencilLine, Plus } from 'lucide-react-native';
import { Fragment, ReactElement, useRef } from 'react';
import { View } from 'react-native';

export default function Index() {
  const headerHeight = useHeaderHeight();
  const params = useLocalSearchParams<{ id: string }>();
  const renderCacheRef = useRef<ReactElement | null>(null);
  const sheetManager = useSheetManager();

  const log = useLog({ id: params.id });
  const logColor = useLogColor({ id: params.id });
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
            <View className="flex-row items-center gap-3">
              <Button
                className="hidden md:flex"
                onPress={() => sheetManager.open('record-create', params.id)}
                size="sm"
                style={{ backgroundColor: logColor.default }}
                variant="secondary"
              >
                <Icon
                  className="-ml-0.5 text-white"
                  icon={PencilLine}
                  size={20}
                />
                <Text className="text-white">New record</Text>
              </Button>
              <LogDropdownMenu
                headerHeight={headerHeight}
                id={log.id}
                name={log.name}
                variant="header"
              />
            </View>
          ),
          headerTitle: () => <Title>{log.name}</Title>,
        }}
      />
      {records.isLoading ? (
        <Loading />
      ) : !records.data.length ? (
        <LogEmptyState logId={params.id} />
      ) : (
        <List
          contentContainerClassName="mx-auto w-full max-w-xl px-3 pb-24 md:px-8 md:pb-8 md:pt-5"
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
      <Button
        className="fixed bottom-6 right-6 size-14 rounded-full md:hidden"
        onPress={() => sheetManager.open('record-create', params.id)}
        size="icon"
        style={{ backgroundColor: logColor.default }}
        variant="secondary"
      >
        <Icon className="text-white" icon={Plus} />
      </Button>
    </Fragment>
  );

  return renderCacheRef.current;
}
