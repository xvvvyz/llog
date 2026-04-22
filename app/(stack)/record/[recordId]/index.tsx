import { RecordOrReply } from '@/features/records/record-or-reply';
import { useBreakpoints } from '@/hooks/use-breakpoints';
import { useLogColor } from '@/hooks/use-log-color';
import { useSafeAreaInsets } from '@/hooks/use-safe-area-insets';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { cn } from '@/lib/cn';
import * as scroll from '@/lib/post-submit-scroll';
import { textToTitle } from '@/lib/text-to-title';
import { useRecord } from '@/queries/use-record';
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
import { ArrowBendDownLeft } from 'phosphor-react-native/lib/module/icons/ArrowBendDownLeft';
import * as React from 'react';
import { View } from 'react-native';

export default function Index() {
  const breakpoints = useBreakpoints();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ recordId: string }>();
  const renderCacheRef = React.useRef<React.ReactElement | null>(null);
  const listRef = React.useRef<ListHandle>(null);
  const sheetManager = useSheetManager();

  const record = useRecord({ id: params.recordId });
  const logColor = useLogColor({ id: record.log?.id });
  const showFab = !breakpoints.md;

  const pendingScroll = scroll.usePostSubmitScroll({
    id: params.recordId,
    scope: 'record',
  });

  const data = React.useMemo(
    () => [{ ...record, replies: undefined }, ...record.replies],
    [record]
  );

  React.useEffect(() => {
    if (pendingScroll !== 'end' || record.isLoading) return;

    const frame = requestAnimationFrame(() => {
      if (!listRef.current) return;
      listRef.current.scrollToEnd({ animated: true });
      scroll.clearPostSubmitScroll({ id: params.recordId, scope: 'record' });
    });

    return () => cancelAnimationFrame(frame);
  }, [data.length, params.recordId, pendingScroll, record.isLoading]);

  if (sheetManager.someOpen()) {
    return renderCacheRef.current;
  }

  renderCacheRef.current = (
    <Page>
      <Header
        left={<BackButton />}
        right={
          <Button
            className="web:hover:opacity-90 hidden active:opacity-90 md:flex"
            onPress={() => sheetManager.open('reply-create', params.recordId)}
            size="xs"
            style={{ backgroundColor: logColor?.default }}
            variant="secondary"
          >
            <Icon
              className="text-contrast-foreground -ml-0.5"
              icon={ArrowBendDownLeft}
            />
            <Text className="text-contrast-foreground">Reply</Text>
          </Button>
        }
        title={textToTitle(record.text)}
        titleClassName="md:text-center"
        titleWrapperClassName="md:absolute"
      />
      {record.isLoading ? (
        <Loading />
      ) : (
        <View
          className="flex-1"
          style={{ paddingBottom: insets.bottom + (showFab ? 104 : 0) }}
        >
          <List
            contentContainerClassName="mx-auto w-full max-w-lg border border-border-secondary rounded-4xl my-4 bg-card md:my-8"
            data={data}
            estimatedItemSize={100}
            keyExtractor={(item) => item.id ?? ''}
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="always"
            listRef={listRef}
            maintainScrollAtEnd
            maintainVisibleContentPosition
            renderItem={({ index, item }) => (
              <RecordOrReply
                className={cn(index === 0 && 'border-t-0')}
                replyId={index > 0 ? item.id : undefined}
                logId={record.log?.id}
                record={item}
                recordId={params.recordId}
                variant="compact"
              />
            )}
            wrapperClassName="flex-1"
          />
        </View>
      )}
      {showFab && (
        <View
          className="absolute right-8 bottom-8"
          style={{ marginBottom: insets.bottom }}
        >
          <Button
            className="web:hover:opacity-90 size-14 rounded-full active:opacity-90"
            onPress={() => sheetManager.open('reply-create', params.recordId)}
            size="icon"
            style={{ backgroundColor: logColor?.default }}
            variant="secondary"
            wrapperClassName="rounded-full"
          >
            <Icon
              className="text-contrast-foreground"
              icon={ArrowBendDownLeft}
            />
          </Button>
        </View>
      )}
    </Page>
  );

  return renderCacheRef.current;
}
