import * as audioTransport from '@/features/files/components/audio-transport';
import * as audioMetadata from '@/features/files/lib/audio-metadata';
import { cn } from '@/lib/cn';
import { formatTime } from '@/lib/format-time';
import * as musicLinks from '@/lib/music-links';
import { Button } from '@/ui/button';
import * as Menu from '@/ui/dropdown-menu';
import { Icon } from '@/ui/icon';
import { Image } from '@/ui/image';
import { Sheet } from '@/ui/sheet';
import { SheetFooter, SheetListScrollView } from '@/ui/sheet-list';
import { Text } from '@/ui/text';
import * as React from 'react';

import {
  Linking,
  Pressable,
  ScrollView,
  View,
  type LayoutChangeEvent,
} from 'react-native';

import {
  AppleLogo,
  DotsThree,
  MusicNote,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  SpotifyLogo,
  YoutubeLogo,
} from 'phosphor-react-native';

const SHEET_AUDIO_TRANSPORT_CLASS_NAME =
  'rounded-xl border border-border-secondary bg-secondary border-continuous';

const SHEET_AUDIO_TRANSPORT_BUTTON_CLASS_NAME = 'rounded-none';
const SHEET_AUDIO_TRANSPORT_BUTTON_WRAPPER_CLASS_NAME = 'rounded-none';
const TRACK_LIST_PRESS_INITIAL_SCROLL_SUPPRESSION_MS = 750;

const TRACK_ARTWORK_OVERLAY_CLASS_NAME =
  'absolute inset-0 items-center justify-center overflow-hidden border-continuous rounded-md bg-contrast-background/45';

const TRACK_ARTWORK_TARGET_SIZE = 512;
type TrackRowLayout = { height: number; y: number };

type TrackListPressScrollSuppression = {
  hasMatchedTrack: boolean;
  index: number;
  pressedAt: number;
};

type AudioMetadataControls = audioTransport.AudioTransportControls & {
  currentTime: number;
  pause: () => void;
  playFrom: (seconds: number) => Promise<void>;
  seekTo: (seconds: number, resumePlayback?: boolean) => void;
};

const useAudioTrackNavigation = (
  tracks: readonly audioMetadata.AudioMetadataTrack[],
  controls: AudioMetadataControls
) => {
  const navigation = audioMetadata.getTrackNavigationState({
    currentTimeSeconds: controls.currentTime,
    pendingTimeSeconds: controls.pendingPlaybackTime,
    tracks,
  });

  const handlePrevious = () => {
    const target = tracks[navigation.previousIndex];
    if (!target) return;
    controls.seekTo(target.startSeconds, controls.isPlaying);
  };

  const handleNext = () => {
    const target = tracks[navigation.nextIndex];
    if (!target) return;
    controls.seekTo(target.startSeconds, controls.isPlaying);
  };

  return {
    canSeekNext: navigation.canSeekNext,
    canSeekPrevious: navigation.canSeekPrevious,
    currentIndex: navigation.currentIndex,
    currentTrack: navigation.currentTrack,
    handleNext,
    handlePrevious,
    pendingIndex: navigation.pendingIndex,
  };
};

export const AudioTrackSkipControls = ({
  buttonClassName = 'rounded-none',
  buttonWrapperClassName = 'rounded-none',
  controls,
  size = 'compact',
  tracks,
}: {
  buttonClassName?: string;
  buttonWrapperClassName?: string;
  controls: AudioMetadataControls;
  size?: 'compact' | 'default';
  tracks: readonly audioMetadata.AudioMetadataTrack[];
}) => {
  const buttonSize = size === 'default' ? 'icon-sm' : 'icon-xs';
  const iconSize = size === 'default' ? 20 : 16;

  const {
    canSeekNext,
    canSeekPrevious,
    currentTrack,
    handleNext,
    handlePrevious,
  } = useAudioTrackNavigation(tracks, controls);

  if (!currentTrack) return null;

  return (
    <View className="flex-row items-center shrink-0">
      <Button
        accessibilityLabel="Previous track"
        className={buttonClassName}
        disabled={controls.isDisabled || !canSeekPrevious}
        onPress={handlePrevious}
        size={buttonSize}
        variant="ghost"
        wrapperClassName={buttonWrapperClassName}
      >
        <Icon
          className="text-muted-foreground"
          icon={SkipBack}
          size={iconSize}
        />
      </Button>
      <Button
        accessibilityLabel="Next track"
        className={buttonClassName}
        disabled={controls.isDisabled || !canSeekNext}
        onPress={handleNext}
        size={buttonSize}
        variant="ghost"
        wrapperClassName={buttonWrapperClassName}
      >
        <Icon
          className="text-muted-foreground"
          icon={SkipForward}
          size={iconSize}
        />
      </Button>
    </View>
  );
};

const getPortalName = (prefix: string, id: string) =>
  `${prefix}-${id.replace(/:/g, '')}`;

const getProviderIcon = (provider: string) => {
  switch (provider) {
    case 'applemusic': {
      return AppleLogo;
    }

    case 'spotify': {
      return SpotifyLogo;
    }

    case 'youtube': {
      return YoutubeLogo;
    }

    default: {
      return MusicNote;
    }
  }
};

const TrackArtwork = ({
  className,
  size,
  track,
}: {
  className?: string;
  size: number;
  track: audioMetadata.AudioMetadataTrack;
}) => {
  const artworkUri = audioMetadata.getTrackArtworkUri(track);

  if (artworkUri) {
    return (
      <Image
        contentFit="cover"
        height={size}
        targetSize={TRACK_ARTWORK_TARGET_SIZE}
        uri={artworkUri}
        width={size}
        wrapperClassName={className}
      />
    );
  }

  return (
    <View className={className} style={{ height: size, width: size }}>
      <View className="flex-1 bg-secondary items-center justify-center">
        <Icon className="text-placeholder" icon={MusicNote} size={18} />
      </View>
    </View>
  );
};

const TrackText = ({ track }: { track: audioMetadata.AudioMetadataTrack }) => (
  <View className="flex-1 min-w-0">
    <Text className="font-medium leading-tight text-sm" numberOfLines={1}>
      {track.title}
    </Text>
    <Text
      className="leading-tight text-muted-foreground text-xs"
      numberOfLines={1}
    >
      {track.artistText}
    </Text>
  </View>
);

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
      <TrackArtwork
        className="overflow-hidden border-continuous rounded-md"
        size={36}
        track={track}
      />
      {showPersistentIcon ? (
        <View
          className={cn(TRACK_ARTWORK_OVERLAY_CLASS_NAME, 'opacity-100')}
          pointerEvents="none"
        >
          <Icon
            className="text-contrast-foreground"
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
            className="text-contrast-foreground"
            icon={Play}
            size={18}
            weight="fill"
          />
        </View>
      )}
    </Button>
  );
};

const TrackLinksMenu = ({
  className,
  track,
}: {
  className?: string;
  track: audioMetadata.AudioMetadataTrack;
}) => {
  if (track.links.length === 0) return null;

  return (
    <View className={className}>
      <Menu.Root>
        <Menu.Trigger asChild>
          <Button
            accessibilityLabel={`Streaming links for ${track.title}`}
            size="icon-xs"
            variant="ghost"
          >
            <Icon className="text-muted-foreground" icon={DotsThree} />
          </Button>
        </Menu.Trigger>
        <Menu.Content align="end">
          {track.links.map((link, index) => (
            <Menu.Item
              key={`${link.provider}:${link.url}:${index}`}
              onPress={() => {
                void Linking.openURL(link.url);
              }}
            >
              <Icon
                className="text-placeholder"
                icon={getProviderIcon(link.provider)}
              />
              <Text>{musicLinks.getMusicLinkProviderLabel(link.provider)}</Text>
            </Menu.Item>
          ))}
        </Menu.Content>
      </Menu.Root>
    </View>
  );
};

export const AudioTranscriptMetadata = ({
  className,
  controls,
  transcript,
}: {
  className?: string;
  controls: audioTransport.AudioTransportControls;
  transcript: string;
}) => {
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);
  const sheetId = React.useId();

  const portalName = React.useMemo(
    () => getPortalName('audio-transcript', sheetId),
    [sheetId]
  );

  return (
    <View className={cn('min-w-0', className)}>
      <Pressable
        accessibilityRole="button"
        className="min-w-0 w-full px-3 py-2"
        onPress={() => setIsSheetOpen(true)}
      >
        <Text
          className="min-w-0 w-full font-normal leading-snug text-left text-sm web:text-pretty"
          numberOfLines={2}
        >
          {transcript}
        </Text>
      </Pressable>
      <Sheet
        onDismiss={() => setIsSheetOpen(false)}
        open={isSheetOpen}
        portalName={portalName}
        variant="list"
      >
        <SheetListScrollView>
          <Text className="leading-relaxed web:text-pretty">{transcript}</Text>
        </SheetListScrollView>
        <SheetFooter contentClassName="gap-3">
          <audioTransport.AudioTransport
            className={SHEET_AUDIO_TRANSPORT_CLASS_NAME}
            controlButtonClassName={SHEET_AUDIO_TRANSPORT_BUTTON_CLASS_NAME}
            controls={controls}
            size="default"
            controlButtonWrapperClassName={
              SHEET_AUDIO_TRANSPORT_BUTTON_WRAPPER_CLASS_NAME
            }
          />
          <Button
            onPress={() => setIsSheetOpen(false)}
            size="sm"
            variant="secondary"
            wrapperClassName="w-full"
          >
            <Text>Close</Text>
          </Button>
        </SheetFooter>
      </Sheet>
    </View>
  );
};

type TrackListRowProps = {
  canPause: boolean;
  index: number;
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
          <TrackText track={track} />
        </Button>
      </View>
      <View className="flex-row gap-3 items-center shrink-0">
        <Text className="text-placeholder text-xs tabular-nums">
          {formatTime(track.startSeconds)}
        </Text>
        <TrackLinksMenu className="-mr-1.5" track={track} />
      </View>
    </View>
  );
};

const MemoizedTrackListRow = React.memo(TrackListRow);

export const AudioTracksMetadata = ({
  className,
  controls,
  tracks,
}: {
  className?: string;
  controls: AudioMetadataControls;
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

  const rowLayoutsRef = React.useRef(new Map<number, TrackRowLayout>());

  const trackListPressScrollSuppressionRef =
    React.useRef<TrackListPressScrollSuppression | null>(null);

  const sheetId = React.useId();

  const portalName = React.useMemo(
    () => getPortalName('audio-tracks', sheetId),
    [sheetId]
  );

  const { currentIndex, currentTrack, pendingIndex } = useAudioTrackNavigation(
    tracks,
    controls
  );

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
        TRACK_LIST_PRESS_INITIAL_SCROLL_SUPPRESSION_MS;

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

  const sheetTransportTrailingAccessory = (
    <AudioTrackSkipControls
      buttonClassName={SHEET_AUDIO_TRANSPORT_BUTTON_CLASS_NAME}
      buttonWrapperClassName={SHEET_AUDIO_TRANSPORT_BUTTON_WRAPPER_CLASS_NAME}
      controls={controls}
      size="default"
      tracks={tracks}
    />
  );

  if (!currentTrack) return null;

  const optimisticPendingIndex =
    optimisticTrackIndex != null && tracks[optimisticTrackIndex]
      ? optimisticTrackIndex
      : -1;

  const visualPendingIndex =
    pendingIndex >= 0 ? pendingIndex : optimisticPendingIndex;

  const visualTargetIndex =
    visualPendingIndex >= 0 ? visualPendingIndex : currentIndex;

  const pauseTargetIndex = pendingIndex >= 0 ? pendingIndex : currentIndex;

  return (
    <View className={cn('min-w-0', className)}>
      <View className="flex-row min-w-0 pl-2 pr-3 py-2 gap-3 items-center">
        <Button
          className="flex-1 flex-row min-w-0 gap-3 group justify-start"
          onPress={() => setIsSheetOpen(true)}
          variant="link"
          wrapperClassName="flex-1 overflow-visible rounded-lg"
        >
          <View className="relative">
            <TrackArtwork
              className="overflow-hidden border-continuous rounded-md"
              size={40}
              track={currentTrack}
            />
          </View>
          <TrackText track={currentTrack} />
        </Button>
        <View className="flex-row items-center shrink-0">
          <TrackLinksMenu track={currentTrack} />
        </View>
      </View>
      <Sheet
        onDismiss={() => setIsSheetOpen(false)}
        open={isSheetOpen}
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
        <SheetFooter contentClassName="gap-3">
          <audioTransport.AudioTransport
            className={SHEET_AUDIO_TRANSPORT_CLASS_NAME}
            controlButtonClassName={SHEET_AUDIO_TRANSPORT_BUTTON_CLASS_NAME}
            controls={controls}
            size="default"
            trailingAccessory={sheetTransportTrailingAccessory}
            controlButtonWrapperClassName={
              SHEET_AUDIO_TRANSPORT_BUTTON_WRAPPER_CLASS_NAME
            }
          />
          <Button
            onPress={() => setIsSheetOpen(false)}
            size="sm"
            variant="secondary"
            wrapperClassName="w-full"
          >
            <Text>Close</Text>
          </Button>
        </SheetFooter>
      </Sheet>
    </View>
  );
};
