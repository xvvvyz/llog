import { LogDropdownMenu } from '@/components/log-dropdown-menu';
import { LogEmptyState } from '@/components/log-empty-state';
import { RecordOrComment } from '@/components/record-or-comment';
import { BackButton } from '@/components/ui/back-button';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/ui/header';
import { Icon } from '@/components/ui/icon';
import { List } from '@/components/ui/list';
import { Loading } from '@/components/ui/loading';
import { Page } from '@/components/ui/page';
import { Text } from '@/components/ui/text';
import { useSheetManager } from '@/context/sheet-manager';
import { useHeaderHeight } from '@/hooks/use-header-height';
import { useHideOnScrollDown } from '@/hooks/use-hide-on-scroll-down';
import { useLogColor } from '@/hooks/use-log-color';
import { useLog } from '@/queries/use-log';
import { useRecords } from '@/queries/use-records';
import { animation } from '@/utilities/animation';
import { cn } from '@/utilities/cn';
import { useLocalSearchParams } from 'expo-router';
import { DotsThreeVertical, Plus } from 'phosphor-react-native';
import { ReactElement, useRef } from 'react';
import { Platform, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function Index() {
  const headerHeight = useHeaderHeight();
  const hideOnScrollDown = useHideOnScrollDown();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ logId: string }>();
  const renderCacheRef = useRef<ReactElement | null>(null);
  const sheetManager = useSheetManager();

  const log = useLog({ id: params.logId });
  const logColor = useLogColor({ id: params.logId });
  const records = useRecords({ logId: params.logId });

  if (sheetManager.someOpen()) {
    return renderCacheRef.current;
  }

  renderCacheRef.current = (
    <Page>
      <Header
        left={<BackButton />}
        right={
          <View className="flex-row items-center">
            <Button
              className="hidden md:flex"
              onPress={() => sheetManager.open('record-create', params.logId)}
              size="xs"
              style={{ backgroundColor: logColor.default }}
              variant="secondary"
            >
              <Icon className="-ml-0.5 text-white" icon={Plus} />
              <Text className="text-white">New record</Text>
            </Button>
            <LogDropdownMenu
              contentClassName="mt-2"
              contentStyle={{
                top: Platform.select({
                  default: headerHeight + insets.top,
                  web: 0,
                }),
              }}
              id={log.id}
              triggerWrapperClassName="md:-mr-4 md:ml-4"
            >
              <Icon
                className="text-foreground"
                icon={DotsThreeVertical}
                size={24}
              />
            </LogDropdownMenu>
          </View>
        }
        title={log.name}
      />
      {records.isLoading ? (
        <Loading />
      ) : !records.data.length ? (
        <LogEmptyState logId={params.logId} />
      ) : (
        <List
          contentContainerClassName="mx-auto w-full max-w-lg px-4"
          contentContainerStyle={{ paddingBottom: `${insets.bottom}px` }}
          data={records.data}
          keyExtractor={(record) => record.id}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="always"
          onScroll={hideOnScrollDown.onScroll}
          renderItem={({ index, item }) => (
            <RecordOrComment
              className={cn(
                'mt-4',
                index === 0 && 'md:mt-8',
                index === records.data.length - 1 && 'mb-4 md:mb-8'
              )}
              logId={params.logId}
              numberOfLines={5}
              record={item}
            />
          )}
          wrapperClassName="flex-1"
        />
      )}
      {hideOnScrollDown.isVisible && (
        <Animated.View
          className="absolute bottom-8 right-8 md:hidden"
          entering={animation(FadeInUp)}
          exiting={animation(FadeOutUp)}
          style={{ marginBottom: insets.bottom }}
        >
          <Button
            className="size-14 rounded-full"
            onPress={() => sheetManager.open('record-create', params.logId)}
            size="icon"
            style={{ backgroundColor: logColor.default }}
            variant="secondary"
            wrapperClassName="rounded-full"
          >
            <Icon className="text-white" icon={Plus} />
          </Button>
        </Animated.View>
      )}
    </Page>
  );

  return renderCacheRef.current;
}
