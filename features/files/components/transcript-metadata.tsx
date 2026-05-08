import * as mediaMetadataPrimitives from '@/features/files/components/media-metadata-primitives';
import * as audioMetadata from '@/features/files/lib/audio-metadata';
import { cn } from '@/lib/cn';
import { formatTime } from '@/lib/format-time';
import { Button } from '@/ui/button';
import { Sheet } from '@/ui/sheet';
import { SheetFooter, SheetListScrollView } from '@/ui/sheet-list';
import { Text } from '@/ui/text';
import * as React from 'react';
import { ScrollView, View, type LayoutChangeEvent } from 'react-native';

const TRANSCRIPT_AUTO_SCROLL_EVENT_IGNORE_MS = 650;
const TRANSCRIPT_USER_SCROLL_SUPPRESSION_MS = 2500;

type TranscriptListPressScrollSuppression = {
  hasMatchedSegment: boolean;
  index: number;
  pressedAt: number;
};

export type TranscriptMetadataControls =
  mediaMetadataPrimitives.MediaMetadataPlaybackControls;

type TranscriptMetadataRenderTriggerProps = {
  openSheet: () => void;
  previewSegment?: audioMetadata.AudioTranscriptSegment;
  visualTargetIndex: number;
};

export const TranscriptMetadata = ({
  controls,
  layer,
  onOpenChange,
  portalHostName,
  portalNamePrefix,
  renderFooter,
  renderTrigger,
  segments,
}: {
  controls: TranscriptMetadataControls;
  layer?: number;
  onOpenChange?: (open: boolean) => void;
  portalHostName?: string;
  portalNamePrefix: string;
  renderFooter?: (props: { closeSheet: () => void }) => React.ReactNode;
  renderTrigger: (
    props: TranscriptMetadataRenderTriggerProps
  ) => React.ReactNode;
  segments: readonly audioMetadata.AudioTranscriptSegment[];
}) => {
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);
  const [listViewportHeight, setListViewportHeight] = React.useState(0);

  const [optimisticSegmentIndex, setOptimisticSegmentIndex] = React.useState<
    number | null
  >(null);

  const [rowLayoutVersion, setRowLayoutVersion] = React.useState(0);

  const listScrollViewRef = React.useRef<React.ComponentRef<
    typeof ScrollView
  > | null>(null);

  const rowLayoutsRef = React.useRef(
    new Map<number, mediaMetadataPrimitives.MetadataRowLayout>()
  );

  const transcriptListPressScrollSuppressionRef =
    React.useRef<TranscriptListPressScrollSuppression | null>(null);

  const userScrollSuppressedUntilRef = React.useRef(0);
  const autoScrollEventsIgnoredUntilRef = React.useRef(0);

  const userScrollIdleTimeoutRef = React.useRef<ReturnType<
    typeof setTimeout
  > | null>(null);

  const sheetId = React.useId();

  const portalName = React.useMemo(
    () =>
      mediaMetadataPrimitives.getMetadataPortalName(portalNamePrefix, sheetId),
    [portalNamePrefix, sheetId]
  );

  const { currentIndex, pendingIndex } =
    audioMetadata.getTranscriptNavigationState({
      currentTimeSeconds: controls.currentTime,
      pendingTimeSeconds: controls.pendingPlaybackTime,
      segments,
    });

  const optimisticPendingIndex =
    optimisticSegmentIndex != null && segments[optimisticSegmentIndex]
      ? optimisticSegmentIndex
      : -1;

  const visualPendingIndex =
    pendingIndex >= 0 ? pendingIndex : optimisticPendingIndex;

  const visualTargetIndex =
    visualPendingIndex >= 0 ? visualPendingIndex : currentIndex;

  const previewSegment =
    visualTargetIndex >= 0 ? segments[visualTargetIndex] : undefined;

  const pauseTargetIndex = pendingIndex >= 0 ? pendingIndex : currentIndex;
  const isPlaying = controls.isPlaying;
  const pause = controls.pause;
  const playFrom = controls.playFrom;

  const markTranscriptListPressScrollSuppression = React.useCallback(
    (index: number) => {
      transcriptListPressScrollSuppressionRef.current = {
        hasMatchedSegment: false,
        index,
        pressedAt: Date.now(),
      };
    },
    []
  );

  const handleStartSegment = React.useCallback(
    (segment: audioMetadata.AudioTranscriptSegment, index: number) => {
      markTranscriptListPressScrollSuppression(index);
      setOptimisticSegmentIndex(index);
      void playFrom(segment.startSeconds);
    },
    [markTranscriptListPressScrollSuppression, playFrom]
  );

  const handleListLayout = React.useCallback((event: LayoutChangeEvent) => {
    setListViewportHeight(event.nativeEvent.layout.height);
  }, []);

  const handleTranscriptRowLayout = React.useCallback(
    (index: number, event: LayoutChangeEvent) => {
      const { height, y } = event.nativeEvent.layout;
      const previous = rowLayoutsRef.current.get(index);
      if (previous?.height === height && previous.y === y) return;
      rowLayoutsRef.current.set(index, { height, y });
      setRowLayoutVersion((version) => version + 1);
    },
    []
  );

  const suppressAutoScrollForUserScroll = React.useCallback(() => {
    userScrollSuppressedUntilRef.current =
      Date.now() + TRANSCRIPT_USER_SCROLL_SUPPRESSION_MS;

    if (userScrollIdleTimeoutRef.current) {
      clearTimeout(userScrollIdleTimeoutRef.current);
    }

    userScrollIdleTimeoutRef.current = setTimeout(() => {
      userScrollIdleTimeoutRef.current = null;
    }, TRANSCRIPT_USER_SCROLL_SUPPRESSION_MS);
  }, []);

  const handleTranscriptListScroll = React.useCallback(() => {
    if (Date.now() < autoScrollEventsIgnoredUntilRef.current) return;
    suppressAutoScrollForUserScroll();
  }, [suppressAutoScrollForUserScroll]);

  React.useEffect(() => {
    if (!isSheetOpen || listViewportHeight <= 0) return;
    if (Date.now() < userScrollSuppressedUntilRef.current) return;
    const rowLayout = rowLayoutsRef.current.get(currentIndex);
    if (!rowLayout) return;
    const suppression = transcriptListPressScrollSuppressionRef.current;

    if (suppression) {
      const isInitialPress =
        Date.now() - suppression.pressedAt <
        mediaMetadataPrimitives.METADATA_LIST_PRESS_INITIAL_SCROLL_SUPPRESSION_MS;

      if (
        isInitialPress ||
        suppression.index === currentIndex ||
        suppression.index === pendingIndex
      ) {
        if (
          suppression.index === currentIndex ||
          suppression.index === pendingIndex
        ) {
          suppression.hasMatchedSegment = true;
        }

        return;
      }

      if (suppression.hasMatchedSegment) {
        transcriptListPressScrollSuppressionRef.current = null;
      }
    }

    const y = Math.max(
      0,
      rowLayout.y - Math.max(0, (listViewportHeight - rowLayout.height) / 2)
    );

    const frame = requestAnimationFrame(() => {
      autoScrollEventsIgnoredUntilRef.current =
        Date.now() + TRANSCRIPT_AUTO_SCROLL_EVENT_IGNORE_MS;

      listScrollViewRef.current?.scrollTo({ animated: true, y });
    });

    return () => cancelAnimationFrame(frame);
  }, [
    currentIndex,
    isSheetOpen,
    listViewportHeight,
    pendingIndex,
    rowLayoutVersion,
  ]);

  React.useEffect(() => {
    if (optimisticSegmentIndex == null) return;

    if (
      optimisticSegmentIndex !== currentIndex &&
      optimisticSegmentIndex !== pendingIndex
    ) {
      return;
    }

    setOptimisticSegmentIndex(null);
  }, [currentIndex, optimisticSegmentIndex, pendingIndex]);

  React.useEffect(() => {
    if (optimisticSegmentIndex == null) return;

    const timeout = setTimeout(() => {
      setOptimisticSegmentIndex((currentOptimisticSegmentIndex) =>
        currentOptimisticSegmentIndex === optimisticSegmentIndex
          ? null
          : currentOptimisticSegmentIndex
      );
    }, 2500);

    return () => clearTimeout(timeout);
  }, [optimisticSegmentIndex]);

  React.useEffect(() => {
    if (isSheetOpen) return;
    transcriptListPressScrollSuppressionRef.current = null;
    setOptimisticSegmentIndex(null);
  }, [isSheetOpen]);

  const openSheet = React.useCallback(() => {
    setIsSheetOpen(true);
  }, []);

  const closeSheet = React.useCallback(() => {
    setIsSheetOpen(false);
  }, []);

  const footer = renderFooter?.({ closeSheet });

  React.useEffect(() => {
    onOpenChange?.(isSheetOpen);
  }, [isSheetOpen, onOpenChange]);

  React.useEffect(
    () => () => {
      if (userScrollIdleTimeoutRef.current) {
        clearTimeout(userScrollIdleTimeoutRef.current);
      }

      onOpenChange?.(false);
    },
    [onOpenChange]
  );

  return (
    <React.Fragment>
      {renderTrigger({ openSheet, previewSegment, visualTargetIndex })}
      <Sheet
        layer={layer}
        onDismiss={closeSheet}
        open={isSheetOpen}
        portalHostName={portalHostName}
        portalName={portalName}
        variant="list"
      >
        <SheetListScrollView
          ref={listScrollViewRef}
          contentContainerClassName="gap-4"
          onLayout={handleListLayout}
          onMomentumScrollBegin={suppressAutoScrollForUserScroll}
          onMomentumScrollEnd={suppressAutoScrollForUserScroll}
          onScroll={handleTranscriptListScroll}
          onScrollBeginDrag={suppressAutoScrollForUserScroll}
          onScrollEndDrag={suppressAutoScrollForUserScroll}
          scrollEventThrottle={16}
          variant="rows"
        >
          {segments.map((segment, index) => {
            const isVisualTarget = index === visualTargetIndex;

            return (
              <TranscriptSegmentRow
                key={`${segment.startSeconds}:${segment.endSeconds}:${index}`}
                index={index}
                isVisualTarget={isVisualTarget}
                onLayout={handleTranscriptRowLayout}
                onPause={pause}
                onPress={handleStartSegment}
                onPressStart={markTranscriptListPressScrollSuppression}
                segment={segment}
                canPause={
                  isVisualTarget && index === pauseTargetIndex && isPlaying
                }
              />
            );
          })}
        </SheetListScrollView>
        {footer && <SheetFooter contentClassName="gap-3">{footer}</SheetFooter>}
      </Sheet>
    </React.Fragment>
  );
};

type TranscriptSegmentRowProps = {
  canPause: boolean;
  index: number;
  isVisualTarget: boolean;
  onLayout: (index: number, event: LayoutChangeEvent) => void;
  onPause: () => void;
  onPress: (
    segment: audioMetadata.AudioTranscriptSegment,
    index: number
  ) => void;
  onPressStart: (index: number) => void;
  segment: audioMetadata.AudioTranscriptSegment;
};

const TranscriptSegmentRow = ({
  canPause,
  index,
  isVisualTarget,
  onLayout,
  onPause,
  onPress,
  onPressStart,
  segment,
}: TranscriptSegmentRowProps) => {
  const handleLayout = React.useCallback(
    (event: LayoutChangeEvent) => onLayout(index, event),
    [index, onLayout]
  );

  const handlePress = React.useCallback(() => {
    onPress(segment, index);
  }, [index, onPress, segment]);

  const handlePressStart = React.useCallback(() => {
    onPressStart(index);
  }, [index, onPressStart]);

  return (
    <View className="min-w-0 w-full" onLayout={handleLayout}>
      <Button
        className="flex-row min-w-0 w-full gap-3 items-baseline justify-start"
        onPress={canPause ? onPause : handlePress}
        onPressIn={handlePressStart}
        variant="link"
        wrapperClassName="w-full overflow-visible rounded-lg"
      >
        <View className="flex-1 min-w-0">
          <Text
            className={cn(
              'min-w-0 font-normal text-left web:whitespace-normal web:break-words web:text-pretty',
              !isVisualTarget && 'text-muted-foreground'
            )}
          >
            {segment.text}
          </Text>
        </View>
        <Text
          className={cn(
            'min-w-12 shrink-0 text-right font-normal text-xs tabular-nums',
            isVisualTarget ? 'text-foreground' : 'text-placeholder'
          )}
        >
          {formatTime(segment.startSeconds)}
        </Text>
      </Button>
    </View>
  );
};
