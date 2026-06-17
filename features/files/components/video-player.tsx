import { useExclusiveFilePlayback } from '@/features/files/hooks/use-exclusive-media-playback';
import { useFileUriToSrc } from '@/features/files/lib/file-uri-to-src';
import { getVideoPosterTarget } from '@/features/files/lib/video-poster-target';
import * as videoPreload from '@/features/files/lib/video-preload';
import type { VideoPlayerHandle } from '@/features/files/types/video-player';
import { Image } from '@/ui/image';
import { Spinner } from '@/ui/spinner';
import { useVideoPlayer, VideoView } from 'expo-video';
import * as React from 'react';
import { Platform, StyleSheet, View } from 'react-native';

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

export const VideoPlayer = ({
  autoPlay,
  contentFit = 'contain',
  handleRef,
  maxHeight,
  maxWidth,
  muted = true,
  onReady,
  onPlayingChange,
  onTimeChange,
  playbackRate = 1,
  resetToken = 0,
  thumbnailQuality,
  thumbnailUri,
  uri,
}: {
  autoPlay?: boolean;
  contentFit?: 'contain' | 'cover';
  handleRef?: React.Ref<VideoPlayerHandle>;
  maxHeight?: number;
  maxWidth?: number;
  muted?: boolean;
  onReady?: () => void;
  onPlayingChange?: (isPlaying: boolean) => void;
  onTimeChange?: (currentTime: number, duration: number) => void;
  playbackRate?: number;
  resetToken?: number;
  thumbnailQuality?: number;
  thumbnailUri?: string | null;
  uri?: string | null;
}) => {
  const source = useFileUriToSrc(uri);
  const posterTarget = getVideoPosterTarget({ maxHeight, maxWidth });
  const onPlayingChangeRef = React.useRef(onPlayingChange);
  const onTimeChangeRef = React.useRef(onTimeChange);
  const [isBuffering, setIsBuffering] = React.useState(Boolean(source));
  const [hasLoadError, setHasLoadError] = React.useState(false);
  const [isScrubbing, setIsScrubbing] = React.useState(false);

  const [showInitialLoadingIndicator, setShowInitialLoadingIndicator] =
    React.useState(() => Boolean(source) && !videoPreload.isVideoWarm(source));

  const scrubbingEnabledRef = React.useRef(false);
  const lastScrubSeekAtRef = React.useRef(0);
  const lastScrubSeekTargetRef = React.useRef<number | null>(null);
  const previousResetTokenRef = React.useRef(resetToken);
  const readyNotifiedRef = React.useRef(false);
  const wasAutoPlayRef = React.useRef(false);
  const videoViewRef = React.useRef<React.ElementRef<typeof VideoView>>(null);

  const [hasRenderedFirstFrame, setHasRenderedFirstFrame] =
    React.useState(false);

  const [isAtStart, setIsAtStart] = React.useState(true);

  const [nativeControlsEnabled, setNativeControlsEnabled] =
    React.useState(false);

  const markVideoReady = React.useCallback(() => {
    videoPreload.markVideoWarm(source);
    setShowInitialLoadingIndicator(false);

    if (!readyNotifiedRef.current) {
      readyNotifiedRef.current = true;
      onReady?.();
    }
  }, [onReady, source]);

  const markFirstFrameRendered = React.useCallback(() => {
    setHasRenderedFirstFrame(true);
    markVideoReady();
  }, [markVideoReady]);

  const showThumbnail =
    Boolean(source) &&
    !hasLoadError &&
    Boolean(thumbnailUri) &&
    isAtStart &&
    !hasRenderedFirstFrame;

  const showLoadingIndicator =
    !source ||
    hasLoadError ||
    (showInitialLoadingIndicator && isBuffering && !isScrubbing);

  const shouldRenderVideoView = Boolean(source) && !hasLoadError;

  const player = useVideoPlayer(source, (player) => {
    player.loop = true;
    player.muted = muted;
    player.playbackRate = playbackRate;
    player.timeUpdateEventInterval = 1 / 60;
    player.seekTolerance = DEFAULT_SEEK_TOLERANCE;
  });

  const pausePlayback = React.useCallback(() => {
    player.pause();
  }, [player]);

  const { claimPlayback, releasePlayback } =
    useExclusiveFilePlayback(pausePlayback);

  const startPlayback = React.useCallback(async () => {
    if (!source) return;

    try {
      await claimPlayback();
      player.play();
    } catch {
      releasePlayback();
    }
  }, [claimPlayback, player, releasePlayback, source]);

  React.useImperativeHandle(handleRef, () => ({
    enterFullscreen: () => {
      setNativeControlsEnabled(true);

      requestAnimationFrame(() => {
        const videoView = videoViewRef.current;

        if (!videoView) {
          setNativeControlsEnabled(false);
          return;
        }

        void videoView
          .enterFullscreen()
          .catch(() => setNativeControlsEnabled(false));
      });
    },
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
        setIsAtStart(videoPreload.isNearVideoStart(quantizedSeconds));
        onTimeChangeRef.current?.(quantizedSeconds, player.duration);
        return;
      }

      lastScrubSeekTargetRef.current = seconds;
      player.currentTime = seconds;
      setIsAtStart(videoPreload.isNearVideoStart(seconds));
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
    if (!onTimeChange || !source) return;

    onTimeChange(
      Number.isFinite(player.currentTime) ? player.currentTime : 0,
      Number.isFinite(player.duration) ? player.duration : 0
    );
  }, [onTimeChange, player, source]);

  React.useEffect(() => {
    player.muted = muted;
  }, [muted, player]);

  React.useEffect(() => {
    player.playbackRate = playbackRate;
  }, [playbackRate, player]);

  React.useEffect(() => {
    if (previousResetTokenRef.current === resetToken) return;
    previousResetTokenRef.current = resetToken;
    pausePlayback();
    setIsBuffering(false);
    setHasLoadError(false);
    setIsScrubbing(false);
    setHasRenderedFirstFrame(false);
    setIsAtStart(true);
    readyNotifiedRef.current = false;
    scrubbingEnabledRef.current = false;
    lastScrubSeekAtRef.current = 0;
    lastScrubSeekTargetRef.current = 0;
    player.seekTolerance = DEFAULT_SEEK_TOLERANCE;

    player.scrubbingModeOptions = {
      scrubbingModeEnabled: false,
      allowSkippingMediaCodecFlush: false,
      enableDynamicScheduling: false,
      increaseCodecOperatingRate: false,
      useDecodeOnlyFlag: false,
    };

    player.currentTime = 0;
    onTimeChangeRef.current?.(0, player.duration);
  }, [pausePlayback, player, resetToken]);

  React.useEffect(() => {
    pausePlayback();
    setIsBuffering(Boolean(source));
    setHasLoadError(false);
    setIsScrubbing(false);

    setShowInitialLoadingIndicator(
      Boolean(source) && !videoPreload.isVideoWarm(source)
    );

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
    setIsAtStart(true);
    readyNotifiedRef.current = false;
    wasAutoPlayRef.current = false;
    onTimeChangeRef.current?.(0, 0);
  }, [pausePlayback, player, source, thumbnailUri]);

  React.useEffect(() => {
    if (!source) {
      setIsBuffering(false);
      setShowInitialLoadingIndicator(false);
      return;
    }

    const statusSub = player.addListener('statusChange', ({ status }) => {
      if (status === 'loading') {
        setIsBuffering(true);
        return;
      }

      setIsBuffering(false);

      if (status === 'error') {
        setHasLoadError(true);
        setShowInitialLoadingIndicator(false);
        releasePlayback();
        return;
      }

      if (status === 'readyToPlay') {
        setHasLoadError(false);
        markVideoReady();
      }
    });

    const playingSub = player.addListener('playingChange', ({ isPlaying }) => {
      if (isPlaying) markFirstFrameRendered();

      if (isPlaying) void claimPlayback();
      else releasePlayback();

      onPlayingChangeRef.current?.(isPlaying);
    });

    const sourceLoadSub = player.addListener('sourceLoad', ({ duration }) => {
      setIsAtStart(videoPreload.isNearVideoStart(player.currentTime));
      markVideoReady();
      onTimeChangeRef.current?.(player.currentTime, duration);
    });

    const timeUpdateSub = player.addListener(
      'timeUpdate',
      ({ currentTime }) => {
        setIsAtStart(videoPreload.isNearVideoStart(currentTime));
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
  }, [
    claimPlayback,
    markFirstFrameRendered,
    markVideoReady,
    player,
    releasePlayback,
    source,
  ]);

  React.useEffect(() => {
    const wasAutoPlay = wasAutoPlayRef.current;
    wasAutoPlayRef.current = Boolean(autoPlay);

    if (!autoPlay) {
      pausePlayback();
      return;
    }

    if (!wasAutoPlay) void startPlayback();
  }, [autoPlay, pausePlayback, startPlayback]);

  return (
    <View
      className="overflow-hidden"
      style={{ width: maxWidth, height: maxHeight }}
    >
      {shouldRenderVideoView && (
        <VideoView
          ref={videoViewRef}
          allowsPictureInPicture={false}
          allowsVideoFrameAnalysis={false}
          contentFit={contentFit}
          fullscreenOptions={{ enable: true }}
          nativeControls={nativeControlsEnabled}
          onFirstFrameRender={markFirstFrameRendered}
          onFullscreenEnter={() => setNativeControlsEnabled(true)}
          onFullscreenExit={() => setNativeControlsEnabled(false)}
          player={player}
          surfaceType={Platform.OS === 'android' ? 'textureView' : undefined}
          style={[
            StyleSheet.absoluteFill,
            { pointerEvents: 'none' },
            showThumbnail && { opacity: 0 },
          ]}
        />
      )}
      {showThumbnail && (
        <View className="absolute inset-0 pointer-events-none">
          <Image
            contentFit={contentFit}
            fill
            quality={thumbnailQuality}
            targetHeight={posterTarget.targetHeight}
            targetWidth={posterTarget.targetWidth}
            uri={thumbnailUri}
            wrapperClassName="bg-transparent"
          />
        </View>
      )}
      {showLoadingIndicator && (
        <View className="absolute inset-0 items-center justify-center">
          <Spinner />
        </View>
      )}
    </View>
  );
};
