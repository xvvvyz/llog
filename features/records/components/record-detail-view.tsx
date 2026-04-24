import { useLogColor } from '@/features/logs/hooks/use-log-color';
import { RecordOrReply } from '@/features/records/components/record-or-reply';
import * as scroll from '@/features/records/lib/post-submit-scroll';
import { type UseRecordResult } from '@/features/records/queries/use-record';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { cn } from '@/lib/cn';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';
import type { ListHandle } from '@/ui/list';
import { List } from '@/ui/list';
import { Loading } from '@/ui/loading';
import { Page } from '@/ui/page';
import { ArrowBendDownLeft } from 'phosphor-react-native';
import * as React from 'react';
import { View } from 'react-native';

export const RecordDetailView = ({
  pageClassName,
  record,
  recordId,
}: {
  pageClassName?: string;
  record: UseRecordResult;
  recordId: string;
}) => {
  const renderCacheRef = React.useRef<React.ReactElement | null>(null);
  const listRef = React.useRef<ListHandle>(null);
  const sheetManager = useSheetManager();
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
      scroll.clearPostSubmitScroll({ id: recordId, scope: 'record' });
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
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="always"
          keyExtractor={(item) => item.id ?? ''}
          listRef={listRef}
          maintainScrollAtEnd
          maintainVisibleContentPosition
          wrapperClassName="flex-1"
          ListFooterComponent={
            contentPaddingBottom > 0 ? (
              <View style={{ height: contentPaddingBottom }} />
            ) : null
          }
          renderItem={({ index, item }) => (
            <RecordOrReply
              logId={record.log?.id}
              record={item}
              recordId={recordId}
              replyId={index > 0 ? item.id : undefined}
              variant="compact"
              className={cn(
                'border-t-0',
                index === data.length - 1 && 'mb-4 md:mb-8'
              )}
            />
          )}
        />
      )}
      <View className="absolute bottom-8 inset-x-0 mx-auto max-w-lg w-full px-4 items-end">
        <Button
          className="size-14 rounded-full active:opacity-90 web:hover:opacity-90"
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
