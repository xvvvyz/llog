import { Image } from '@/components/ui/image';
import { useExclusiveMediaPlayback } from '@/hooks/use-exclusive-media-playback';
import { useFileUriToSrc } from '@/utilities/file-uri-to-src';
import { useVideoPlayer, VideoView } from 'expo-video';
import * as React from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';

const DEFAULT_SEEK_TOLERANCE = {
  toleranceAfter: 0,
  toleranceBefore: 0,
} as const;

const SCRUB_SEEK_TOLERANCE = {
  toleranceAfter: 0.75,
  toleranceBefore: 0.75,
} as const;

const SCRUB_PREVIEW_SEEK_INTERVAL_MS = 40;
const SCRUB_PREVIEW_STEP_SECONDS = 0.05;
const SCRUB_PREVIEW_MIN_DELTA_SECONDS = 0.03;

export interface VideoPlayerHandle {
  pause: () => void;
  play: () => void;
  seekTo: (seconds: number) => void;
  setScrubbingEnabled: (enabled: boolean) => void;
  toggleMute: () => boolean;
  togglePlay: () => boolean;
}

export const VideoPlayer = ({
  autoPlay,
  contentFit = 'contain',
  handleRef,
  maxHeight,
  maxWidth,
  muted = true,
  onPlayingChange,
  onTimeChange,
  thumbnailUri,
  uri,
}: {
  autoPlay?: boolean;
  contentFit?: 'contain' | 'cover';
  handleRef?: React.Ref<VideoPlayerHandle>;
  maxHeight?: number;
  maxWidth?: number;
  muted?: boolean;
  onPlayingChange?: (isPlaying: boolean) => void;
  onTimeChange?: (currentTime: number, duration: number) => void;
  thumbnailUri?: string | null;
  uri: string;
}) => {
  const source = useFileUriToSrc(uri);
  const onPlayingChangeRef = React.useRef(onPlayingChange);
  const onTimeChangeRef = React.useRef(onTimeChange);
  const [isBuffering, setIsBuffering] = React.useState(Boolean(source));
  const [isScrubbing, setIsScrubbing] = React.useState(false);
  const scrubbingEnabledRef = React.useRef(false);
  const lastScrubSeekAtRef = React.useRef(0);
  const lastScrubSeekTargetRef = React.useRef<number | null>(null);

  const [hasRenderedFirstFrame, setHasRenderedFirstFrame] =
    React.useState(false);

  const markFirstFrameRendered = React.useCallback(() => {
    setHasRenderedFirstFrame(true);
  }, []);

  const showThumbnail = Boolean(thumbnailUri) && !hasRenderedFirstFrame;

  const showLoadingIndicator =
    isBuffering && !isScrubbing && !hasRenderedFirstFrame;

  const player = useVideoPlayer(source, (player) => {
    player.loop = true;
    player.muted = muted;
    player.timeUpdateEventInterval = 1 / 60;
    player.seekTolerance = DEFAULT_SEEK_TOLERANCE;
  });

  const pausePlayback = React.useCallback(() => {
    player.pause();
  }, [player]);

  const { claimPlayback, releasePlayback } =
    useExclusiveMediaPlayback(pausePlayback);

  const startPlayback = React.useCallback(async () => {
    if (!source) return;
    await claimPlayback();
    player.play();
  }, [claimPlayback, player, source]);

  React.useImperativeHandle(handleRef, () => ({
    pause: () => {
      player.pause();
    },
    play: () => {
      void startPlayback();
    },
    seekTo: (seconds: number) => {
      if (scrubbingEnabledRef.current) {
        const now = Date.now();

        const quantizedSeconds =
          Math.round(seconds / SCRUB_PREVIEW_STEP_SECONDS) *
          SCRUB_PREVIEW_STEP_SECONDS;

        const currentTime = Number.isFinite(player.currentTime)
          ? player.currentTime
          : 0;

        const lastTarget = lastScrubSeekTargetRef.current;

        const isEffectivelyUnchanged =
          Math.abs(currentTime - quantizedSeconds) <
            SCRUB_PREVIEW_MIN_DELTA_SECONDS ||
          (lastTarget != null &&
            Math.abs(lastTarget - quantizedSeconds) <
              SCRUB_PREVIEW_MIN_DELTA_SECONDS);

        if (
          isEffectivelyUnchanged ||
          now - lastScrubSeekAtRef.current < SCRUB_PREVIEW_SEEK_INTERVAL_MS
        ) {
          return;
        }

        lastScrubSeekAtRef.current = now;
        lastScrubSeekTargetRef.current = quantizedSeconds;
        player.currentTime = quantizedSeconds;
        onTimeChangeRef.current?.(quantizedSeconds, player.duration);
        return;
      }

      lastScrubSeekTargetRef.current = seconds;
      player.currentTime = seconds;
      onTimeChangeRef.current?.(player.currentTime, player.duration);
    },
    setScrubbingEnabled: (enabled: boolean) => {
      scrubbingEnabledRef.current = enabled;
      setIsScrubbing(enabled);

      player.seekTolerance = enabled
        ? SCRUB_SEEK_TOLERANCE
        : DEFAULT_SEEK_TOLERANCE;

      player.scrubbingModeOptions = {
        scrubbingModeEnabled: enabled,
        allowSkippingMediaCodecFlush: enabled,
        enableDynamicScheduling: enabled,
        increaseCodecOperatingRate: enabled,
        useDecodeOnlyFlag: enabled,
      };

      if (enabled) {
        lastScrubSeekAtRef.current = 0;
        lastScrubSeekTargetRef.current = null;
      }
    },
    toggleMute: () => {
      player.muted = !player.muted;
      return player.muted;
    },
    togglePlay: () => {
      if (player.playing) {
        player.pause();
        return false;
      } else {
        void startPlayback();
        return true;
      }
    },
  }));

  React.useEffect(() => {
    onPlayingChangeRef.current = onPlayingChange;
  }, [onPlayingChange]);

  React.useEffect(() => {
    onTimeChangeRef.current = onTimeChange;
  }, [onTimeChange]);

  React.useEffect(() => {
    player.muted = muted;
  }, [muted, player]);

  React.useEffect(() => {
    setIsBuffering(Boolean(source));
    setIsScrubbing(false);
    scrubbingEnabledRef.current = false;
    lastScrubSeekAtRef.current = 0;
    lastScrubSeekTargetRef.current = null;
    player.seekTolerance = DEFAULT_SEEK_TOLERANCE;

    player.scrubbingModeOptions = {
      scrubbingModeEnabled: false,
      allowSkippingMediaCodecFlush: false,
      enableDynamicScheduling: false,
      increaseCodecOperatingRate: false,
      useDecodeOnlyFlag: false,
    };

    setHasRenderedFirstFrame(false);
    onTimeChangeRef.current?.(0, 0);
  }, [player, source, thumbnailUri]);

  React.useEffect(() => {
    if (!source) {
      setIsBuffering(false);
      return;
    }

    const statusSub = player.addListener('statusChange', ({ status }) => {
      setIsBuffering(status === 'loading');
    });

    const playingSub = player.addListener('playingChange', ({ isPlaying }) => {
      if (isPlaying) markFirstFrameRendered();
      if (isPlaying) void claimPlayback();
      else releasePlayback();
      onPlayingChangeRef.current?.(isPlaying);
    });

    const sourceLoadSub = player.addListener('sourceLoad', ({ duration }) => {
      onTimeChangeRef.current?.(player.currentTime, duration);
    });

    const timeUpdateSub = player.addListener(
      'timeUpdate',
      ({ currentTime }) => {
        if (currentTime > 0) markFirstFrameRendered();
        onTimeChangeRef.current?.(currentTime, player.duration);
      }
    );

    return () => {
      statusSub.remove();
      playingSub.remove();
      sourceLoadSub.remove();
      timeUpdateSub.remove();
    };
  }, [claimPlayback, markFirstFrameRendered, player, releasePlayback, source]);

  React.useEffect(() => {
    if (!autoPlay) return;
    void startPlayback();
  }, [autoPlay, startPlayback]);

  return (
    <View
      className="overflow-hidden"
      style={{ width: maxWidth, height: maxHeight }}
    >
      <VideoView
        contentFit={contentFit}
        onFirstFrameRender={markFirstFrameRendered}
        player={player}
        surfaceType={Platform.OS === 'android' ? 'textureView' : undefined}
        style={[StyleSheet.absoluteFill, showThumbnail && { opacity: 0 }]}
      />
      {showThumbnail && (
        <View className="pointer-events-none" style={StyleSheet.absoluteFill}>
          <Image fill contentFit={contentFit} uri={thumbnailUri} />
        </View>
      )}
      {showLoadingIndicator && (
        <View className="absolute inset-0 items-center justify-center">
          <ActivityIndicator color="white" />
        </View>
      )}
    </View>
  );
};
