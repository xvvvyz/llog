import * as mediaMetadataPrimitives from '@/features/files/components/media-metadata-primitives';
import * as audioMetadata from '@/features/files/lib/audio-metadata';
import { cn } from '@/lib/cn';
import { formatTime } from '@/lib/format-time';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { Sheet } from '@/ui/sheet';
import { SheetFooter, SheetListScrollView } from '@/ui/sheet-list';
import { Text } from '@/ui/text';
import { Pause, Play } from 'phosphor-react-native';
import * as React from 'react';
import { ScrollView, View, type LayoutChangeEvent } from 'react-native';

const TRACK_ARTWORK_OVERLAY_CLASS_NAME =
  'absolute inset-0 items-center justify-center overflow-hidden border-continuous rounded-md bg-background/45';

type TrackListPressScrollSuppression = {
  hasMatchedTrack: boolean;
  index: number;
  pressedAt: number;
};

export type TrackMetadataControls =
  mediaMetadataPrimitives.MediaMetadataPlaybackControls;

type TrackMetadataRenderTriggerProps = {
  currentTrack: audioMetadata.AudioMetadataTrack;
  openSheet: () => void;
  visualTargetIndex: number;
};

const TrackArtworkButton = ({
  canPause,
  onPause,
  onPlay,
  onPressStart,
  showPauseIcon,
  showPersistentIcon,
  track,
}: {
  canPause: boolean;
  onPause: () => void;
  onPlay: () => void;
  onPressStart?: () => void;
  showPauseIcon: boolean;
  showPersistentIcon: boolean;
  track: audioMetadata.AudioMetadataTrack;
}) => {
  return (
    <Button
      className="relative group"
      onPress={canPause ? onPause : onPlay}
      onPressIn={onPressStart}
      pressOnWebTouchRelease={false}
      variant="link"
      wrapperClassName="overflow-visible rounded-md"
      accessibilityLabel={
        canPause ? `Pause ${track.title}` : `Play ${track.title}`
      }
    >
      <mediaMetadataPrimitives.TrackArtwork
        className="overflow-hidden border-continuous rounded-md"
        size={mediaMetadataPrimitives.TRACK_SHEET_ARTWORK_SIZE}
        track={track}
      />
      {showPersistentIcon ? (
        <View
          className={cn(TRACK_ARTWORK_OVERLAY_CLASS_NAME, 'opacity-100')}
          pointerEvents="none"
        >
          <Icon
            className="text-foreground"
            icon={showPauseIcon ? Pause : Play}
            size={18}
            weight="fill"
          />
        </View>
      ) : (
        <View
          pointerEvents="none"
          className={cn(
            TRACK_ARTWORK_OVERLAY_CLASS_NAME,
            'opacity-0 web:transition-opacity web:group-hover:opacity-100'
          )}
        >
          <Icon
            className="text-foreground"
            icon={Play}
            size={18}
            weight="fill"
          />
        </View>
      )}
    </Button>
  );
};

type TrackListRowProps = {
  canPause: boolean;
  index: number;
  isVisualTarget: boolean;
  menuPortalHostName?: string;
  onLayout: (index: number, event: LayoutChangeEvent) => void;
  onPause: () => void;
  onPress: (track: audioMetadata.AudioMetadataTrack, index: number) => void;
  onPressStart: (index: number) => void;
  showPauseIcon: boolean;
  showPersistentIcon: boolean;
  track: audioMetadata.AudioMetadataTrack;
};

const TrackListRow = ({
  canPause,
  index,
  isVisualTarget,
  menuPortalHostName,
  onLayout,
  onPause,
  onPress,
  onPressStart,
  showPauseIcon,
  showPersistentIcon,
  track,
}: TrackListRowProps) => {
  const handleLayout = React.useCallback(
    (event: LayoutChangeEvent) => onLayout(index, event),
    [index, onLayout]
  );

  const handlePress = React.useCallback(() => {
    onPress(track, index);
  }, [index, onPress, track]);

  const handlePressStart = React.useCallback(() => {
    onPressStart(index);
  }, [index, onPressStart]);

  const rowAction = canPause ? onPause : handlePress;

  return (
    <View
      className="flex-row min-w-0 gap-3 items-center"
      onLayout={handleLayout}
    >
      <View className="flex-1 flex-row min-w-0 gap-3 group items-center">
        <TrackArtworkButton
          canPause={canPause}
          onPause={onPause}
          onPlay={handlePress}
          onPressStart={handlePressStart}
          showPauseIcon={showPauseIcon}
          showPersistentIcon={showPersistentIcon}
          track={track}
        />
        <Button
          className="flex-1 flex-row min-w-0 gap-3 justify-start"
          onPress={rowAction}
          onPressIn={handlePressStart}
          variant="link"
          wrapperClassName="flex-1 overflow-visible rounded-lg"
        >
          <mediaMetadataPrimitives.TrackText track={track} />
        </Button>
      </View>
      <View className="flex-row gap-3 items-center shrink-0">
        <Text
          className={cn(
            'text-xs tabular-nums',
            isVisualTarget ? 'text-foreground' : 'text-placeholder'
          )}
        >
          {formatTime(track.startSeconds)}
        </Text>
        <mediaMetadataPrimitives.TrackLinksMenu
          className="-mr-1.5"
          portalHostName={menuPortalHostName}
          track={track}
        />
      </View>
    </View>
  );
};

const MemoizedTrackListRow = React.memo(TrackListRow);

export const TrackMetadata = ({
  controls,
  layer,
  onOpenChange,
  portalHostName,
  portalNamePrefix,
  renderFooter,
  renderTrigger,
  tracks,
}: {
  controls: TrackMetadataControls;
  layer?: number;
  onOpenChange?: (open: boolean) => void;
  portalHostName?: string;
  portalNamePrefix: string;
  renderFooter?: (props: { closeSheet: () => void }) => React.ReactNode;
  renderTrigger: (props: TrackMetadataRenderTriggerProps) => React.ReactNode;
  tracks: readonly audioMetadata.AudioMetadataTrack[];
}) => {
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);
  const [listViewportHeight, setListViewportHeight] = React.useState(0);

  const [optimisticTrackIndex, setOptimisticTrackIndex] = React.useState<
    number | null
  >(null);

  const [rowLayoutVersion, setRowLayoutVersion] = React.useState(0);

  const listScrollViewRef = React.useRef<React.ComponentRef<
    typeof ScrollView
  > | null>(null);

  const rowLayoutsRef = React.useRef(
    new Map<number, mediaMetadataPrimitives.MetadataRowLayout>()
  );

  const trackListPressScrollSuppressionRef =
    React.useRef<TrackListPressScrollSuppression | null>(null);

  const sheetId = React.useId();

  const portalName = React.useMemo(
    () =>
      mediaMetadataPrimitives.getMetadataPortalName(portalNamePrefix, sheetId),
    [portalNamePrefix, sheetId]
  );

  const { currentIndex, currentTrack, pendingIndex } =
    audioMetadata.getTrackNavigationState({
      currentTimeSeconds: controls.currentTime,
      pendingTimeSeconds: controls.pendingPlaybackTime,
      tracks,
    });

  const isPlaying = controls.isPlaying;
  const pause = controls.pause;
  const playFrom = controls.playFrom;

  const markTrackListPressScrollSuppression = React.useCallback(
    (index: number) => {
      trackListPressScrollSuppressionRef.current = {
        hasMatchedTrack: false,
        index,
        pressedAt: Date.now(),
      };
    },
    []
  );

  const handleStartTrack = React.useCallback(
    (track: audioMetadata.AudioMetadataTrack, index: number) => {
      markTrackListPressScrollSuppression(index);
      setOptimisticTrackIndex(index);
      void playFrom(track.startSeconds);
    },
    [markTrackListPressScrollSuppression, playFrom]
  );

  const handleListLayout = React.useCallback((event: LayoutChangeEvent) => {
    setListViewportHeight(event.nativeEvent.layout.height);
  }, []);

  const handleTrackRowLayout = React.useCallback(
    (index: number, event: LayoutChangeEvent) => {
      const { height, y } = event.nativeEvent.layout;
      const previous = rowLayoutsRef.current.get(index);
      if (previous?.height === height && previous.y === y) return;
      rowLayoutsRef.current.set(index, { height, y });
      setRowLayoutVersion((version) => version + 1);
    },
    []
  );

  React.useEffect(() => {
    if (!isSheetOpen || listViewportHeight <= 0) return;
    const rowLayout = rowLayoutsRef.current.get(currentIndex);
    if (!rowLayout) return;
    const suppression = trackListPressScrollSuppressionRef.current;

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
          suppression.hasMatchedTrack = true;
        }

        return;
      }

      if (suppression.hasMatchedTrack) {
        trackListPressScrollSuppressionRef.current = null;
      }
    }

    const y = Math.max(
      0,
      rowLayout.y - Math.max(0, (listViewportHeight - rowLayout.height) / 2)
    );

    const frame = requestAnimationFrame(() => {
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
    if (optimisticTrackIndex == null) return;

    if (
      optimisticTrackIndex !== currentIndex &&
      optimisticTrackIndex !== pendingIndex
    ) {
      return;
    }

    setOptimisticTrackIndex(null);
  }, [currentIndex, optimisticTrackIndex, pendingIndex]);

  React.useEffect(() => {
    if (optimisticTrackIndex == null) return;

    const timeout = setTimeout(() => {
      setOptimisticTrackIndex((currentOptimisticTrackIndex) =>
        currentOptimisticTrackIndex === optimisticTrackIndex
          ? null
          : currentOptimisticTrackIndex
      );
    }, 2500);

    return () => clearTimeout(timeout);
  }, [optimisticTrackIndex]);

  React.useEffect(() => {
    if (isSheetOpen) return;
    trackListPressScrollSuppressionRef.current = null;
    setOptimisticTrackIndex(null);
  }, [isSheetOpen]);

  const optimisticPendingIndex =
    optimisticTrackIndex != null && tracks[optimisticTrackIndex]
      ? optimisticTrackIndex
      : -1;

  const visualPendingIndex =
    pendingIndex >= 0 ? pendingIndex : optimisticPendingIndex;

  const visualTargetIndex =
    visualPendingIndex >= 0 ? visualPendingIndex : currentIndex;

  const pauseTargetIndex = pendingIndex >= 0 ? pendingIndex : currentIndex;

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
      onOpenChange?.(false);
    },
    [onOpenChange]
  );

  if (!currentTrack) return null;

  return (
    <React.Fragment>
      {renderTrigger({ currentTrack, openSheet, visualTargetIndex })}
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
          contentContainerClassName="gap-3"
          onLayout={handleListLayout}
          variant="rows"
        >
          {tracks.map((track, index) => {
            const isVisualTarget = index === visualTargetIndex;

            return (
              <MemoizedTrackListRow
                key={`${track.startSeconds}:${track.title}:${index}`}
                index={index}
                isVisualTarget={isVisualTarget}
                menuPortalHostName={portalHostName}
                onLayout={handleTrackRowLayout}
                onPause={pause}
                onPress={handleStartTrack}
                onPressStart={markTrackListPressScrollSuppression}
                showPauseIcon={isVisualTarget && isPlaying}
                showPersistentIcon={isVisualTarget}
                track={track}
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
