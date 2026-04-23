import { useLogColor } from '@/features/logs/hooks/use-log-color';
import { RecordOrReply } from '@/features/records/components/record-or-reply';
import * as scroll from '@/features/records/lib/post-submit-scroll';
import { useRecord } from '@/features/records/queries/use-record';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { cn } from '@/lib/cn';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';
import type { ListHandle } from '@/ui/list';
import { List } from '@/ui/list';
import { Loading } from '@/ui/loading';
import { Page } from '@/ui/page';
import { ArrowBendDownLeft } from 'phosphor-react-native/lib/module/icons/ArrowBendDownLeft';
import * as React from 'react';
import { View } from 'react-native';

export const RecordDetailView = ({
  pageClassName,
  recordId,
}: {
  pageClassName?: string;
  recordId: string;
}) => {
  const renderCacheRef = React.useRef<React.ReactElement | null>(null);
  const listRef = React.useRef<ListHandle>(null);
  const sheetManager = useSheetManager();

  const record = useRecord({ id: recordId });
  const logColor = useLogColor({ id: record.log?.id });
  const contentPaddingBottom = 104;

  const pendingScroll = scroll.usePostSubmitScroll({
    id: recordId,
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

      scroll.clearPostSubmitScroll({
        id: recordId,
        scope: 'record',
      });
    });

    return () => cancelAnimationFrame(frame);
  }, [data.length, pendingScroll, record.isLoading, recordId]);

  if (sheetManager.someOpen() && renderCacheRef.current) {
    return renderCacheRef.current;
  }

  renderCacheRef.current = (
    <Page className={pageClassName}>
      {record.isLoading ? (
        <Loading />
      ) : (
        <List
          contentContainerClassName="mx-auto w-full max-w-lg pt-4 web:pt-[45px]"
          data={data}
          estimatedItemSize={100}
          keyExtractor={(item) => item.id ?? ''}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="always"
          ListFooterComponent={
            contentPaddingBottom > 0 ? (
              <View style={{ height: contentPaddingBottom }} />
            ) : null
          }
          listRef={listRef}
          maintainScrollAtEnd
          maintainVisibleContentPosition
          renderItem={({ index, item }) => (
            <RecordOrReply
              className={cn(
                'border-t-0',
                index === data.length - 1 && 'mb-4 md:mb-8'
              )}
              replyId={index > 0 ? item.id : undefined}
              logId={record.log?.id}
              record={item}
              recordId={recordId}
              variant="compact"
            />
          )}
          wrapperClassName="flex-1"
        />
      )}
      <View className="absolute inset-x-0 bottom-8 mx-auto w-full max-w-lg items-end px-4">
        <Button
          className="web:hover:opacity-90 size-14 rounded-full active:opacity-90"
          onPress={() => sheetManager.open('reply-create', recordId)}
          size="icon"
          style={{ backgroundColor: logColor?.default }}
          variant="secondary"
          wrapperClassName="rounded-full"
        >
          <Icon className="text-contrast-foreground" icon={ArrowBendDownLeft} />
        </Button>
      </View>
    </Page>
  );

  return renderCacheRef.current;
};
