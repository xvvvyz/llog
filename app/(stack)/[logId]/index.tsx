import { DropdownMenu } from '@/features/logs/components/dropdown-menu';
import { EmptyState } from '@/features/logs/components/empty-state';
import { useLogColor } from '@/features/logs/hooks/use-color';
import { useLog } from '@/features/logs/queries/use-log';
import { Entry } from '@/features/records/components/entry';
import * as scroll from '@/features/records/lib/post-submit-scroll';
import { useRecords } from '@/features/records/queries/use-records';
import { useBreakpoints } from '@/hooks/use-breakpoints';
import { useHeaderHeight } from '@/hooks/use-header-height';
import { useSafeAreaInsets } from '@/hooks/use-safe-area-insets';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { cn } from '@/lib/cn';
import { BackButton } from '@/ui/back-button';
import { Button } from '@/ui/button';
import { Header } from '@/ui/header';
import { Icon } from '@/ui/icon';
import type { ListHandle } from '@/ui/list';
import { List } from '@/ui/list';
import { Loading } from '@/ui/loading';
import { NotFound } from '@/ui/not-found';
import { Page } from '@/ui/page';
import { Text } from '@/ui/text';
import { useLocalSearchParams } from 'expo-router';
import { DotsThreeVertical, Plus } from 'phosphor-react-native';
import * as React from 'react';
import { Platform, View } from 'react-native';

export default function Index() {
  const breakpoints = useBreakpoints();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ logId: string }>();
  const renderCacheRef = React.useRef<React.ReactElement | null>(null);
  const listRef = React.useRef<ListHandle>(null);
  const sheetManager = useSheetManager();
  const log = useLog({ id: params.logId });
  const logColor = useLogColor({ id: params.logId });
  const records = useRecords({ logId: params.logId });
  const recordData = records.data;
  const recordsLoading = records.isLoading;
  const logNotFound = !params.logId || (!log.isLoading && !log.id);
  const hasRecords = recordData.length > 0;
  const showFab = hasRecords && !breakpoints.md;
  const contentPaddingBottom = insets.bottom + (showFab ? 104 : 0);

  const pendingScroll = scroll.usePostSubmitScroll({
    id: params.logId,
    scope: 'log',
  });

  React.useEffect(() => {
    if (pendingScroll !== 'top' || recordsLoading || !hasRecords) return;

    const frame = requestAnimationFrame(() => {
      if (!listRef.current) return;
      listRef.current.scrollToOffset({ animated: true, offset: 0 });
      scroll.clearPostSubmitScroll({ id: params.logId, scope: 'log' });
    });

    return () => cancelAnimationFrame(frame);
  }, [
    hasRecords,
    params.logId,
    pendingScroll,
    recordData.length,
    recordsLoading,
  ]);

  if (sheetManager.someOpen() && renderCacheRef.current) {
    return renderCacheRef.current;
  }

  renderCacheRef.current = (
    <Page>
      <Header
        left={<BackButton />}
        title={log.name}
        right={
          log.id ? (
            <View className="flex-row items-center">
              {hasRecords && (
                <Button
                  className="hidden active:opacity-90 md:flex web:hover:opacity-90"
                  size="xs"
                  style={{ backgroundColor: logColor.default }}
                  variant="secondary"
                  onPress={() =>
                    sheetManager.open('record-create', params.logId)
                  }
                >
                  <Icon
                    className="-ml-0.5 text-contrast-foreground"
                    icon={Plus}
                  />
                  <Text className="text-contrast-foreground">Record</Text>
                </Button>
              )}
              <DropdownMenu
                contentClassName="mt-2"
                id={log.id}
                triggerWrapperClassName="md:-mr-4 md:ml-4"
                contentStyle={{
                  top: Platform.select({
                    default: headerHeight + insets.top,
                    web: 0,
                  }),
                }}
              >
                <Icon
                  className="text-foreground"
                  icon={DotsThreeVertical}
                  size={24}
                />
              </DropdownMenu>
            </View>
          ) : null
        }
      />
      {logNotFound ? (
        <NotFound />
      ) : log.isLoading || recordsLoading ? (
        <Loading />
      ) : !hasRecords ? (
        <EmptyState logId={params.logId} />
      ) : (
        <List
          contentContainerClassName="mx-auto w-full max-w-lg px-4"
          data={recordData}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="always"
          keyExtractor={(record) => record.id}
          listRef={listRef}
          onEndReached={records.loadNextPage}
          onEndReachedThreshold={1}
          wrapperClassName="flex-1"
          ListFooterComponent={
            contentPaddingBottom > 0 ? (
              <View style={{ height: contentPaddingBottom }} />
            ) : null
          }
          renderItem={({ index, item }) => (
            <Entry
              logId={params.logId}
              numberOfLines={5}
              record={item}
              className={cn(
                'mt-4',
                index === 0 && 'md:mt-8',
                index === recordData.length - 1 && 'mb-4 md:mb-8'
              )}
            />
          )}
        />
      )}
      {showFab && (
        <View
          className="absolute bottom-8 right-8"
          style={{ marginBottom: insets.bottom }}
        >
          <Button
            className="size-14 rounded-full active:opacity-90 web:hover:opacity-90"
            onPress={() => sheetManager.open('record-create', params.logId)}
            size="icon"
            style={{ backgroundColor: logColor.default }}
            variant="secondary"
            wrapperClassName="rounded-full"
          >
            <Icon className="text-contrast-foreground" icon={Plus} />
          </Button>
        </View>
      )}
    </Page>
  );

  return renderCacheRef.current;
}
