import * as mediaPlaybackRate from '@/features/files/lib/media-playback-rate';
import { cn } from '@/lib/cn';
import { formatTime } from '@/lib/format-time';
import { Button } from '@/ui/button';
import * as Menu from '@/ui/dropdown-menu';
import { Icon } from '@/ui/icon';
import { Text } from '@/ui/text';
import * as React from 'react';
import { type LayoutChangeEvent, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useSharedValue } from 'react-native-reanimated';

import {
  Check,
  DotsThreeVertical,
  FastForward,
  Pause,
  Play,
  Rewind,
  Speedometer,
} from 'phosphor-react-native';

const AUDIO_SEEK_STEP_SECONDS = 5;
type AudioTransportSize = 'compact' | 'default';

export type AudioTransportControls = {
  currentPlaybackRate: mediaPlaybackRate.AudioPlaybackRate;
  handlePlaybackRateChange: (
    playbackRate: mediaPlaybackRate.AudioPlaybackRate
  ) => void;
  handleScrubEnd: (seconds: number) => void;
  handleScrubMove: (seconds: number) => void;
  handleScrubStart: () => void;
  isDisabled: boolean;
  isPlaying: boolean;
  pendingPlaybackTime: number | null;
  playerDuration: number;
  progress: number;
  seekBy: (secondsDelta: number) => void;
  timeLabelTime: number;
  togglePlayback: () => void;
};

export const AudioTransport = ({
  className,
  controlButtonClassName = 'rounded-none',
  controlButtonWrapperClassName = 'rounded-none',
  controls,
  optionsMenuContent,
  showOptionsMenu = true,
  showPlaybackRate = true,
  size = 'compact',
  trailingAccessory,
}: {
  className?: string;
  controlButtonClassName?: string;
  controlButtonWrapperClassName?: string;
  controls: AudioTransportControls;
  optionsMenuContent?: React.ReactNode;
  showOptionsMenu?: boolean;
  showPlaybackRate?: boolean;
  size?: AudioTransportSize;
  trailingAccessory?: React.ReactNode;
}) => {
  const trackWidth = useSharedValue(0);
  const isDefaultSize = size === 'default';
  const buttonSize = isDefaultSize ? 'icon-sm' : 'icon-xs';
  const iconSize = isDefaultSize ? 20 : 16;

  const heightClassName = isDefaultSize
    ? 'h-10 min-h-10 max-h-10'
    : 'h-8 min-h-8 max-h-8';

  const gapClassName = isDefaultSize ? 'gap-3' : 'gap-2';
  const timeTextClassName = isDefaultSize ? 'text-sm' : 'text-xs';
  const trailingPaddingClassName = isDefaultSize ? 'pr-4' : 'pr-3';
  const hasOptionsMenuContent = optionsMenuContent != null;

  const shouldShowOptionsMenu =
    showOptionsMenu && (showPlaybackRate || hasOptionsMenuContent);

  const hasTrailingControls =
    trailingAccessory != null || showPlaybackRate || shouldShowOptionsMenu;

  const {
    currentPlaybackRate,
    handlePlaybackRateChange,
    handleScrubEnd,
    handleScrubMove,
    handleScrubStart,
    isDisabled,
    isPlaying,
    playerDuration,
    progress,
    seekBy,
    timeLabelTime,
    togglePlayback,
  } = controls;

  const handleTrackLayout = React.useCallback(
    (event: LayoutChangeEvent) => {
      trackWidth.value = event.nativeEvent.layout.width;
    },
    [trackWidth]
  );

  const scrubTo = (x: number) => {
    'worklet';
    if (trackWidth.value <= 0 || playerDuration <= 0) return;
    const fraction = Math.max(0, Math.min(x / trackWidth.value, 1));
    runOnJS(handleScrubMove)(fraction * playerDuration);
  };

  const finishScrub = (x: number) => {
    'worklet';
    if (trackWidth.value <= 0 || playerDuration <= 0) return;
    const fraction = Math.max(0, Math.min(x / trackWidth.value, 1));
    runOnJS(handleScrubEnd)(fraction * playerDuration);
  };

  const tap = Gesture.Tap().onEnd((e) => {
    'worklet';
    runOnJS(handleScrubStart)();
    scrubTo(e.x);
    finishScrub(e.x);
  });

  const pan = Gesture.Pan()
    .onStart((e) => {
      'worklet';
      runOnJS(handleScrubStart)();
      scrubTo(e.x);
    })
    .onUpdate((e) => {
      'worklet';
      scrubTo(e.x);
    })
    .onEnd((e) => {
      'worklet';
      finishScrub(e.x);
    });

  const gesture = Gesture.Race(pan, tap);

  return (
    <View
      className={cn(
        'flex-row min-w-0 items-center overflow-hidden px-0',
        heightClassName,
        gapClassName,
        !hasTrailingControls && trailingPaddingClassName,
        className
      )}
    >
      <Button
        className={controlButtonClassName}
        disabled={isDisabled}
        onPress={togglePlayback}
        size={buttonSize}
        variant="ghost"
        wrapperClassName={controlButtonWrapperClassName}
      >
        <Icon icon={isPlaying ? Pause : Play} size={iconSize} />
      </Button>
      <View
        className={cn(
          'flex-1 flex-row min-w-0 items-center',
          heightClassName,
          gapClassName
        )}
      >
        <View
          className={cn(
            'relative flex-1 min-w-0 justify-center',
            heightClassName
          )}
        >
          <View
            className="relative overflow-hidden h-1 w-full border-continuous rounded-full bg-progress-track"
            onLayout={handleTrackLayout}
          >
            <View
              className="absolute bottom-0 left-0 top-0 border-continuous rounded-full bg-progress-fill"
              style={{ width: `${progress * 100}%` }}
            />
          </View>
          <GestureDetector gesture={gesture}>
            <Animated.View className="absolute -bottom-2 -top-2 left-0 right-0" />
          </GestureDetector>
        </View>
        <Text
          className={cn(
            'leading-tight text-placeholder text-right shrink-0 tabular-nums',
            timeTextClassName
          )}
        >
          {formatTime(timeLabelTime)}
        </Text>
      </View>
      {hasTrailingControls && (
        <View className="flex-row items-center shrink-0">
          {trailingAccessory ??
            (showPlaybackRate && (
              <React.Fragment>
                <Button
                  accessibilityLabel="Back 5 seconds"
                  className={controlButtonClassName}
                  disabled={isDisabled}
                  onPress={() => seekBy(-AUDIO_SEEK_STEP_SECONDS)}
                  size={buttonSize}
                  variant="ghost"
                  wrapperClassName={controlButtonWrapperClassName}
                >
                  <Icon icon={Rewind} size={iconSize} />
                </Button>
                <Button
                  accessibilityLabel="Forward 5 seconds"
                  className={controlButtonClassName}
                  disabled={isDisabled}
                  onPress={() => seekBy(AUDIO_SEEK_STEP_SECONDS)}
                  size={buttonSize}
                  variant="ghost"
                  wrapperClassName={controlButtonWrapperClassName}
                >
                  <Icon icon={FastForward} size={iconSize} />
                </Button>
              </React.Fragment>
            ))}
          {shouldShowOptionsMenu && (
            <Menu.Root>
              <Menu.Trigger asChild>
                <Button
                  accessibilityLabel="Audio options"
                  className={controlButtonClassName}
                  disabled={isDisabled}
                  size={buttonSize}
                  variant="ghost"
                  wrapperClassName={controlButtonWrapperClassName}
                >
                  <Icon icon={DotsThreeVertical} size={iconSize} />
                </Button>
              </Menu.Trigger>
              <Menu.Content align="end" className="min-w-48">
                {showPlaybackRate &&
                  mediaPlaybackRate.PLAYBACK_RATES.map((playbackRate) => {
                    const isSelected = playbackRate === currentPlaybackRate;

                    return (
                      <Menu.Item
                        key={playbackRate}
                        onPress={() => handlePlaybackRateChange(playbackRate)}
                      >
                        <Icon
                          className="text-placeholder"
                          icon={isSelected ? Check : Speedometer}
                        />
                        <Text className="tabular-nums">
                          {playbackRate.toFixed(1)}×
                        </Text>
                      </Menu.Item>
                    );
                  })}
                {showPlaybackRate && hasOptionsMenuContent && (
                  <Menu.Separator />
                )}
                {optionsMenuContent}
              </Menu.Content>
            </Menu.Root>
          )}
        </View>
      )}
    </View>
  );
};
