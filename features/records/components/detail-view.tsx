import { useLogColor } from '@/features/logs/hooks/use-color';
import { Entry } from '@/features/records/components/entry';
import * as scroll from '@/features/records/lib/post-submit-scroll';
import { type UseRecordResult } from '@/features/records/queries/use-record';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { cn } from '@/lib/cn';
import { getSpectrumBackgroundClassName } from '@/theme/spectrum-class-names';
import { Button } from '@/ui/button';
import { Page } from '@/ui/page';
import { useSheetScrollHandler } from '@/ui/sheet-drag-context';
import { Text } from '@/ui/text';
import * as React from 'react';
import { Animated, Easing, ScrollView, View } from 'react-native';

const TargetEntryHighlight = ({
  className,
  targetKey,
}: {
  className: string;
  targetKey: string;
}) => {
  const opacity = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    opacity.setValue(1);

    const animation = Animated.sequence([
      Animated.delay(900),
      Animated.timing(opacity, {
        duration: 900,
        easing: Easing.out(Easing.cubic),
        toValue: 0,
        useNativeDriver: true,
      }),
    ]);

    animation.start();
    return () => animation.stop();
  }, [opacity, targetKey]);

  return (
    <View className="absolute inset-0 overflow-hidden pointer-events-none">
      <Animated.View
        className={cn('absolute inset-0', className)}
        style={{
          opacity: opacity.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 0.08],
          }),
        }}
      />
    </View>
  );
};

export const DetailView = ({
  highlightRecord,
  onClose,
  pageClassName,
  record,
  recordId,
  targetReplyId,
}: {
  highlightRecord?: boolean;
  onClose: () => void;
  pageClassName?: string;
  record: UseRecordResult;
  recordId: string;
  targetReplyId?: string;
}) => {
  const scrollViewRef = React.useRef<ScrollView>(null);
  const scrolledTargetRef = React.useRef<string | undefined>(undefined);

  const [postSubmitTargetReplyId, setPostSubmitTargetReplyId] =
    React.useState<string>();

  const [entryLayouts, setEntryLayouts] = React.useState<
    Record<string, number>
  >({});

  const sheetManager = useSheetManager();
  const handleScroll = useSheetScrollHandler();
  const logColor = useLogColor({ id: record.log?.id });
  const canReply = !record.localStatus;

  const pendingScroll = scroll.usePostSubmitScroll({
    id: recordId,
    scope: 'record',
  });

  const pendingScrollReplyId =
    pendingScroll && typeof pendingScroll === 'object'
      ? pendingScroll.replyId
      : undefined;

  const effectiveTargetReplyId =
    targetReplyId ?? pendingScrollReplyId ?? postSubmitTargetReplyId;

  React.useEffect(() => {
    setPostSubmitTargetReplyId(undefined);
  }, [recordId]);

  React.useEffect(() => {
    if (pendingScrollReplyId) setPostSubmitTargetReplyId(pendingScrollReplyId);
  }, [pendingScrollReplyId]);

  const data = React.useMemo(
    () => [{ ...record, replies: undefined }, ...record.replies],
    [record]
  );

  const targetReplyLayout = effectiveTargetReplyId
    ? entryLayouts[effectiveTargetReplyId]
    : null;

  React.useEffect(() => {
    if (
      !effectiveTargetReplyId ||
      record.isLoading ||
      targetReplyLayout == null
    ) {
      return;
    }

    const targetKey = `${recordId}:${effectiveTargetReplyId}`;
    if (scrolledTargetRef.current === targetKey) return;

    const frame = requestAnimationFrame(() => {
      if (!scrollViewRef.current) return;

      scrollViewRef.current.scrollTo({
        animated: false,
        y: Math.max(0, targetReplyLayout - 12),
      });

      scrolledTargetRef.current = targetKey;

      if (pendingScrollReplyId === effectiveTargetReplyId) {
        scroll.clearPostSubmitScroll({ id: recordId, scope: 'record' });
      }
    });

    return () => cancelAnimationFrame(frame);
  }, [
    effectiveTargetReplyId,
    pendingScrollReplyId,
    record.isLoading,
    recordId,
    targetReplyLayout,
  ]);

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
        {data.map((item, index) => {
          const replyId = index > 0 ? item.id : undefined;

          const shouldHighlight =
            (replyId && replyId === effectiveTargetReplyId) ||
            (!replyId && highlightRecord && !effectiveTargetReplyId);

          const highlightKey = replyId ?? recordId;

          return (
            <View
              key={item.id ?? index}
              className="relative"
              onLayout={(event) => {
                if (!replyId) return;
                const y = event.nativeEvent.layout.y;

                setEntryLayouts((prev) =>
                  prev[replyId] === y ? prev : { ...prev, [replyId]: y }
                );
              }}
            >
              {shouldHighlight && (
                <TargetEntryHighlight
                  targetKey={`${recordId}:${highlightKey}`}
                  className={getSpectrumBackgroundClassName(
                    logColor.colorIndex
                  )}
                />
              )}
              <Entry
                className="border-t-0"
                logId={record.log?.id}
                logName={record.log?.name}
                record={item}
                recordId={recordId}
                replyId={replyId}
                variant="compact"
              />
            </View>
          );
        })}
      </ScrollView>
      <View className="h-18 shrink-0">
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
            disabled={!canReply}
            size="sm"
            variant="secondary"
            wrapperClassName="flex-1"
            className={cn(
              'active:opacity-90 web:hover:opacity-90',
              getSpectrumBackgroundClassName(logColor.colorIndex)
            )}
            onPress={() =>
              sheetManager.open('reply-create', recordId, undefined, {
                teamId: record.teamId,
              })
            }
          >
            <Text className="text-white">Reply</Text>
          </Button>
        </View>
      </View>
    </Page>
  );
};
