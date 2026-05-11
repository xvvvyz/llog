import { useLogColor } from '@/features/logs/hooks/use-color';
import { Entry } from '@/features/records/components/entry';
import * as scroll from '@/features/records/lib/post-submit-scroll';
import { type UseRecordResult } from '@/features/records/queries/use-record';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { cn } from '@/lib/cn';
import { Button } from '@/ui/button';
import { Page } from '@/ui/page';
import { useSheetScrollHandler } from '@/ui/sheet-drag';
import { Text } from '@/ui/text';
import * as React from 'react';
import { ScrollView, View } from 'react-native';

export const DetailView = ({
  onClose,
  pageClassName,
  record,
  recordId,
}: {
  onClose: () => void;
  pageClassName?: string;
  record: UseRecordResult;
  recordId: string;
}) => {
  const scrollViewRef = React.useRef<ScrollView>(null);
  const sheetManager = useSheetManager();
  const handleScroll = useSheetScrollHandler();
  const logColor = useLogColor({ id: record.log?.id });

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
      if (!scrollViewRef.current) return;
      scrollViewRef.current.scrollToEnd({ animated: true });
      scroll.clearPostSubmitScroll({ id: recordId, scope: 'record' });
    });

    return () => cancelAnimationFrame(frame);
  }, [data.length, pendingScroll, record.isLoading, recordId]);

  return (
    <Page className={cn('flex-col min-h-0', pageClassName)}>
      <ScrollView
        ref={scrollViewRef}
        className="flex-1 -mx-px min-h-0 border-b border-border-secondary border-continuous border-x rounded-b-4xl"
        contentContainerClassName="mx-auto w-full max-w-lg"
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="always"
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {data.map((item, index) => (
          <Entry
            key={item.id ?? index}
            className="border-t-0"
            logId={record.log?.id}
            record={item}
            recordId={recordId}
            replyId={index > 0 ? item.id : undefined}
            variant="compact"
          />
        ))}
      </ScrollView>
      <View className="h-[4.5rem] shrink-0">
        <View className="flex-row mx-auto max-w-lg w-full p-4 gap-4">
          <Button
            onPress={onClose}
            size="sm"
            variant="secondary"
            wrapperClassName="flex-1"
          >
            <Text>Close</Text>
          </Button>
          <Button
            className="active:opacity-90 web:hover:opacity-90"
            onPress={() => sheetManager.open('reply-create', recordId)}
            size="sm"
            style={{ backgroundColor: logColor.default }}
            variant="secondary"
            wrapperClassName="flex-1"
          >
            <Text className="text-white">Reply</Text>
          </Button>
        </View>
      </View>
    </Page>
  );
};
