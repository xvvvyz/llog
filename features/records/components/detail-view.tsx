import { useLogColor } from '@/features/logs/hooks/use-color';
import * as localEntry from '@/features/offline/local-entry';
import { Entry } from '@/features/records/components/entry';
import * as scroll from '@/features/records/lib/post-submit-scroll';
import { type UseRecordResult } from '@/features/records/queries/use-record';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { useSafeAreaInsets } from '@/hooks/use-safe-area-insets';
import { cn } from '@/lib/cn';
import { BREAKPOINT_VALUES } from '@/theme/tokens';
import { Button } from '@/ui/button';
import { getSheetAvailableHeight, SHEET_DEFAULT_TOP_INSET } from '@/ui/sheet';
import { Text } from '@/ui/text';
import { useNativeScrollOverflow } from '@/ui/use-native-scroll-overflow';
import * as React from 'react';
import * as spectrumClassNames from '@/theme/spectrum-class-names';

import {
  Animated,
  Easing,
  ScrollView,
  useWindowDimensions,
  View,
} from 'react-native';

const DETAIL_VIEW_FOOTER_HEIGHT = 72;
const DETAIL_VIEW_MIN_SCROLL_HEIGHT = 96;

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
  const logColor = useLogColor({ id: record.log?.id });
  const canReply = !localEntry.hasLocalStatus(record);
  const insets = useSafeAreaInsets();
  const windowDimensions = useWindowDimensions();
  const isDesktopSheet = windowDimensions.width >= BREAKPOINT_VALUES.md;

  const maxSheetHeight = Math.max(
    DETAIL_VIEW_FOOTER_HEIGHT + DETAIL_VIEW_MIN_SCROLL_HEIGHT,
    getSheetAvailableHeight({
      insetBottom: insets.bottom,
      insetTop: insets.top,
      isDesktopSheet,
      topInset: SHEET_DEFAULT_TOP_INSET,
      viewportHeight: windowDimensions.height,
    })
  );

  const maxScrollHeight = Math.max(
    DETAIL_VIEW_MIN_SCROLL_HEIGHT,
    maxSheetHeight - DETAIL_VIEW_FOOTER_HEIGHT
  );

  const {
    handleContentSizeChange,
    handleLayout: handleScrollLayout,
    handleScroll,
    scrollEnabled,
  } = useNativeScrollOverflow();

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
    <View
      style={{ maxHeight: maxSheetHeight }}
      className={cn(
        'flex-col min-h-0 overflow-hidden bg-popover',
        pageClassName
      )}
    >
      <ScrollView
        ref={scrollViewRef}
        className="-mx-px min-h-0 border-b border-border-secondary border-continuous border-x rounded-b-4xl"
        contentContainerClassName="mx-auto w-full max-w-lg"
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="always"
        onContentSizeChange={handleContentSizeChange}
        onLayout={handleScrollLayout}
        onScroll={handleScroll}
        scrollEnabled={scrollEnabled}
        scrollEventThrottle={16}
        style={{ maxHeight: maxScrollHeight }}
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
                  className={spectrumClassNames.getSpectrumBackgroundClassName(
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
            className={spectrumClassNames.getSpectrumBackgroundClassName(
              logColor.colorIndex
            )}
            interactiveClassName={cn(
              'active:opacity-90 web:hover:opacity-90',
              spectrumClassNames.getSpectrumInteractiveBackgroundClassName(
                logColor.colorIndex
              )
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
    </View>
  );
};
