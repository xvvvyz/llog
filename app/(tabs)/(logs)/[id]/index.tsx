import { LogDropdownMenu } from '@/components/log-dropdown-menu';
import { LogEmptyState } from '@/components/log-empty-state';
import RecordListRecord from '@/components/record-list-record';
import { BackButton } from '@/components/ui/back-button';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/ui/header';
import { Icon } from '@/components/ui/icon';
import { List } from '@/components/ui/list';
import { Loading } from '@/components/ui/loading';
import { Text } from '@/components/ui/text';
import { useSheetManager } from '@/context/sheet-manager';
import { useHideOnScrollDown } from '@/hooks/use-hide-on-scroll-down';
import { useLogColor } from '@/hooks/use-log-color';
import { useLog } from '@/queries/use-log';
import { useRecords } from '@/queries/use-records';
import { animation } from '@/utilities/ui/utils';
import { useLocalSearchParams } from 'expo-router';
import { PencilLine, Plus } from 'lucide-react-native';
import { Fragment, ReactElement, useRef } from 'react';
import { View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';

export default function Index() {
  const hideOnScrollDown = useHideOnScrollDown();
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
      <Header
        left={<BackButton />}
        right={
          <View className="flex-row items-center">
            <Button
              className="hidden md:flex"
              onPress={() => sheetManager.open('record-create', params.id)}
              size="xs"
              style={{ backgroundColor: logColor.default }}
              variant="secondary"
            >
              <Icon
                className="-ml-0.5 text-white"
                icon={PencilLine}
                size={16}
              />
              <Text className="text-white">New record</Text>
            </Button>
            <LogDropdownMenu id={log.id} variant="header" />
          </View>
        }
        title={log.name}
      />
      {records.isLoading ? (
        <Loading />
      ) : !records.data.length ? (
        <LogEmptyState logId={params.id} />
      ) : (
        <List
          contentContainerClassName="mx-auto w-full max-w-xl px-3 pb-3 md:px-8 md:pb-8 md:pt-5"
          data={records.data}
          keyExtractor={(record) => record.id}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="always"
          onScroll={hideOnScrollDown.onScroll}
          renderItem={({ item }) => <RecordListRecord record={item} />}
        />
      )}
      {hideOnScrollDown.isVisible && (
        <Animated.View
          entering={animation(FadeInUp)}
          exiting={animation(FadeOutUp)}
          className="absolute bottom-6 right-6 md:hidden"
        >
          <Button
            className="size-14 rounded-full"
            onPress={() => sheetManager.open('record-create', params.id)}
            size="icon"
            style={{ backgroundColor: logColor.default }}
            variant="secondary"
            wrapperClassName="rounded-full"
          >
            <Icon className="text-white" icon={Plus} />
          </Button>
        </Animated.View>
      )}
    </Fragment>
  );

  return renderCacheRef.current;
}
