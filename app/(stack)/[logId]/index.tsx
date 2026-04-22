import { LogDropdownMenu } from '@/features/logs/log-dropdown-menu';
import { LogEmptyState } from '@/features/logs/log-empty-state';
import { RecordOrReply } from '@/features/records/record-or-reply';
import { useBreakpoints } from '@/hooks/use-breakpoints';
import { useHeaderHeight } from '@/hooks/use-header-height';
import { useLogColor } from '@/hooks/use-log-color';
import { useSafeAreaInsets } from '@/hooks/use-safe-area-insets';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { cn } from '@/lib/cn';
import * as scroll from '@/lib/post-submit-scroll';
import { useLog } from '@/queries/use-log';
import { useRecords } from '@/queries/use-records';
import { BackButton } from '@/ui/back-button';
import { Button } from '@/ui/button';
import { Header } from '@/ui/header';
import { Icon } from '@/ui/icon';
import type { ListHandle } from '@/ui/list';
import { List } from '@/ui/list';
import { Loading } from '@/ui/loading';
import { Page } from '@/ui/page';
import { Text } from '@/ui/text';
import { useLocalSearchParams } from 'expo-router';
import { DotsThreeVertical } from 'phosphor-react-native/lib/module/icons/DotsThreeVertical';
import { Plus } from 'phosphor-react-native/lib/module/icons/Plus';
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
  const hasRecords = records.data.length > 0;
  const showFab = hasRecords && !breakpoints.md;

  const pendingScroll = scroll.usePostSubmitScroll({
    id: params.logId,
    scope: 'log',
  });

  React.useEffect(() => {
    if (pendingScroll !== 'top' || records.isLoading || !hasRecords) return;

    const frame = requestAnimationFrame(() => {
      if (!listRef.current) return;
      listRef.current.scrollToOffset({ animated: true, offset: 0 });
      scroll.clearPostSubmitScroll({
        id: params.logId,
        scope: 'log',
      });
    });

    return () => cancelAnimationFrame(frame);
  }, [
    hasRecords,
    params.logId,
    pendingScroll,
    records.data.length,
    records.isLoading,
  ]);

  if (sheetManager.someOpen()) {
    return renderCacheRef.current;
  }

  renderCacheRef.current = (
    <Page>
      <Header
        left={<BackButton />}
        right={
          <View className="flex-row items-center">
            {hasRecords && (
              <Button
                className="web:hover:opacity-90 hidden active:opacity-90 md:flex"
                onPress={() => sheetManager.open('record-create', params.logId)}
                size="xs"
                style={{ backgroundColor: logColor.default }}
                variant="secondary"
              >
                <Icon
                  className="text-contrast-foreground -ml-0.5"
                  icon={Plus}
                />
                <Text className="text-contrast-foreground">Record</Text>
              </Button>
            )}
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
      ) : !hasRecords ? (
        <LogEmptyState logId={params.logId} />
      ) : (
        <List
          contentContainerClassName="mx-auto w-full max-w-lg px-4"
          contentContainerStyle={{
            paddingBottom: insets.bottom + (showFab ? 104 : 0),
          }}
          data={records.data}
          keyExtractor={(record) => record.id}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="always"
          listRef={listRef}
          renderItem={({ index, item }) => (
            <RecordOrReply
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
      {showFab && (
        <View
          className="absolute right-8 bottom-8"
          style={{ marginBottom: insets.bottom }}
        >
          <Button
            className="web:hover:opacity-90 size-14 rounded-full active:opacity-90"
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
