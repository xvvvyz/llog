import { useExclusiveMediaPlayback } from '@/features/media/hooks/use-exclusive-media-playback';
import { useFileUriToSrc } from '@/features/media/lib/file-uri-to-src';
import * as videoPreload from '@/features/media/lib/video-preload';
import type { VideoPlayerHandle } from '@/features/media/types/video-player';
import { cn } from '@/lib/cn';
import { UI } from '@/theme/ui';
import { Spinner } from '@/ui/spinner';
import HlsClient, { Events as HlsEvents } from 'hls.js';
import * as React from 'react';

const isHlsClientSupported = () => HlsClient['isSupported']();

const resetVideoSource = (video: HTMLVideoElement) => {
  video.removeAttribute('src');
  video.load();
};

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
  resetToken?: number;
  thumbnailQuality?: number;
  thumbnailUri?: string | null;
  uri: string;
}) => {
  const src = useFileUriToSrc(uri);
  const poster = useFileUriToSrc(thumbnailUri, { quality: thumbnailQuality });
  const ref = React.useRef<HTMLVideoElement>(null);
  const onPlayingChangeRef = React.useRef(onPlayingChange);
  const onTimeChangeRef = React.useRef(onTimeChange);

  const pausePlayback = React.useCallback(() => {
    ref.current?.pause();
  }, []);

  const { claimPlayback, releasePlayback } =
    useExclusiveMediaPlayback(pausePlayback);

  const [isBuffering, setIsBuffering] = React.useState(true);

  const [showInitialLoadingIndicator, setShowInitialLoadingIndicator] =
    React.useState(() => Boolean(src) && !videoPreload.isVideoWarm(src));

  const [hasRenderedFirstFrame, setHasRenderedFirstFrame] =
    React.useState(false);

  const [isAtStart, setIsAtStart] = React.useState(true);
  const rafRef = React.useRef<number>(0);
  const scrubbingEnabledRef = React.useRef(false);
  const lastScrubSeekAtRef = React.useRef(0);
  const lastScrubSeekTargetRef = React.useRef<number | null>(null);
  const previousResetTokenRef = React.useRef(resetToken);
  const readyNotifiedRef = React.useRef(false);
  const wasAutoPlayRef = React.useRef(false);

  const markVideoReady = React.useCallback(() => {
    videoPreload.markVideoWarm(src);
    setShowInitialLoadingIndicator(false);

    if (!readyNotifiedRef.current) {
      readyNotifiedRef.current = true;
      onReady?.();
    }
  }, [onReady, src]);

  const showThumbnail = Boolean(poster) && isAtStart && !hasRenderedFirstFrame;
  const showLoadingIndicator = showInitialLoadingIndicator && isBuffering;

  React.useEffect(() => {
    onPlayingChangeRef.current = onPlayingChange;
  }, [onPlayingChange]);

  React.useEffect(() => {
    onTimeChangeRef.current = onTimeChange;
    if (!onTimeChange || !src) return;
    const video = ref.current;
    if (!video) return;

    onTimeChange(
      Number.isFinite(video.currentTime) ? video.currentTime : 0,
      Number.isFinite(video.duration) ? video.duration : 0
    );
  }, [onTimeChange, src]);

  React.useEffect(() => {
    setIsBuffering(Boolean(src));

    setShowInitialLoadingIndicator(
      Boolean(src) && !videoPreload.isVideoWarm(src)
    );

    setHasRenderedFirstFrame(false);
    setIsAtStart(true);
    readyNotifiedRef.current = false;
    wasAutoPlayRef.current = false;
    onTimeChangeRef.current?.(0, 0);
  }, [src]);

  React.useEffect(() => {
    if (previousResetTokenRef.current === resetToken) return;
    previousResetTokenRef.current = resetToken;
    const video = ref.current;
    if (!video) return;
    video.pause();
    setIsBuffering(false);
    setHasRenderedFirstFrame(false);
    setIsAtStart(true);
    readyNotifiedRef.current = false;
    scrubbingEnabledRef.current = false;
    lastScrubSeekAtRef.current = 0;
    lastScrubSeekTargetRef.current = 0;

    try {
      video.currentTime = 0;
    } catch {}

    onTimeChangeRef.current?.(0, video.duration);
  }, [resetToken]);

  const play = React.useCallback(async () => {
    const video = ref.current;
    if (!video) return;
    if (!src) return;

    try {
      await claimPlayback();
      await video.play();
    } catch {
      releasePlayback();
    }
  }, [claimPlayback, releasePlayback, src]);

  React.useImperativeHandle(handleRef, () => ({
    pause: () => {
      ref.current?.pause();
    },
    play: () => {
      void play();
    },
    seekTo: (seconds: number) => {
      const video = ref.current;
      if (!video) return;

      if (scrubbingEnabledRef.current) {
        const now = performance.now();

        const quantizedSeconds =
          Math.round(seconds / SCRUB_PREVIEW_STEP_SECONDS) *
          SCRUB_PREVIEW_STEP_SECONDS;

        const currentTime = Number.isFinite(video.currentTime)
          ? video.currentTime
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

        if (typeof video.fastSeek === 'function') {
          video.fastSeek(quantizedSeconds);
        } else {
          video.currentTime = quantizedSeconds;
        }

        setIsAtStart(videoPreload.isNearVideoStart(quantizedSeconds));
      } else {
        lastScrubSeekTargetRef.current = seconds;
        video.currentTime = seconds;
        setIsAtStart(videoPreload.isNearVideoStart(seconds));
      }

      onTimeChangeRef.current?.(video.currentTime, video.duration);
    },
    setScrubbingEnabled: (enabled: boolean) => {
      scrubbingEnabledRef.current = enabled;

      if (enabled) {
        lastScrubSeekAtRef.current = 0;
        lastScrubSeekTargetRef.current = null;
      }
    },
    toggleMute: () => {
      const video = ref.current;
      if (!video) return true;
      video.muted = !video.muted;
      return video.muted;
    },
    togglePlay: () => {
      const video = ref.current;
      if (!video) return false;

      if (video.paused) {
        void play();
        return true;
      } else {
        video.pause();
        return false;
      }
    },
  }));

  React.useEffect(() => {
    const video = ref.current;
    if (!video) return;

    if (!src) {
      resetVideoSource(video);
      return;
    }

    const canPlayNativeHls =
      video.canPlayType('application/vnd.apple.mpegurl') !== '' ||
      video.canPlayType('application/x-mpegURL') !== '';

    if (!canPlayNativeHls && isHlsClientSupported()) {
      const hls = new HlsClient();

      hls.on(HlsEvents.MEDIA_ATTACHED, () => {
        hls.loadSource(src);
      });

      hls.on(HlsEvents.MANIFEST_PARSED, () => {
        setIsBuffering(false);
        markVideoReady();
      });

      hls.on(HlsEvents.ERROR, (_, data) => {
        if (data.fatal) {
          setIsBuffering(false);
          setShowInitialLoadingIndicator(false);
          releasePlayback();
        }
      });

      hls.attachMedia(video);

      return () => {
        hls.destroy();
        resetVideoSource(video);
      };
    }

    video.src = src;
    video.load();

    return () => {
      resetVideoSource(video);
    };
  }, [markVideoReady, releasePlayback, src]);

  React.useEffect(() => {
    const video = ref.current;
    if (!video) return;
    if (!src) return;
    const onWaiting = () => setIsBuffering(true);

    const onPlaying = () => {
      setIsBuffering(false);
      setHasRenderedFirstFrame(true);
      markVideoReady();
    };

    const onCanPlay = () => {
      setIsBuffering(false);
      markVideoReady();
    };

    const onLoadedData = () => {
      setIsBuffering(false);
      setHasRenderedFirstFrame(true);
      markVideoReady();
      syncTime();
    };

    const syncTime = () => {
      const currentTime = Number.isFinite(video.currentTime)
        ? video.currentTime
        : 0;

      setIsAtStart(videoPreload.isNearVideoStart(currentTime));

      onTimeChangeRef.current?.(
        currentTime,
        Number.isFinite(video.duration) ? video.duration : 0
      );
    };

    video.addEventListener('waiting', onWaiting);
    video.addEventListener('playing', onPlaying);
    video.addEventListener('canplay', onCanPlay);
    video.addEventListener('loadeddata', onLoadedData);
    video.addEventListener('loadedmetadata', syncTime);
    video.addEventListener('durationchange', syncTime);
    video.addEventListener('timeupdate', syncTime);
    video.addEventListener('seeked', syncTime);

    const onPlay = async () => {
      await claimPlayback();
      onPlayingChangeRef.current?.(true);
    };

    const onPause = () => {
      releasePlayback();
      onPlayingChangeRef.current?.(false);
    };

    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);

    return () => {
      video.removeEventListener('waiting', onWaiting);
      video.removeEventListener('playing', onPlaying);
      video.removeEventListener('canplay', onCanPlay);
      video.removeEventListener('loadeddata', onLoadedData);
      video.removeEventListener('loadedmetadata', syncTime);
      video.removeEventListener('durationchange', syncTime);
      video.removeEventListener('timeupdate', syncTime);
      video.removeEventListener('seeked', syncTime);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
    };
  }, [claimPlayback, markVideoReady, releasePlayback, src]);

  React.useEffect(() => {
    const video = ref.current;
    if (!video || !src) return;

    const tick = () => {
      onTimeChangeRef.current?.(
        Number.isFinite(video.currentTime) ? video.currentTime : 0,
        Number.isFinite(video.duration) ? video.duration : 0
      );

      rafRef.current = requestAnimationFrame(tick);
    };

    const start = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(tick);
    };

    const stop = () => {
      cancelAnimationFrame(rafRef.current);
    };

    video.addEventListener('play', start);
    video.addEventListener('pause', stop);
    video.addEventListener('ended', stop);
    if (!video.paused) rafRef.current = requestAnimationFrame(tick);

    return () => {
      stop();
      video.removeEventListener('play', start);
      video.removeEventListener('pause', stop);
      video.removeEventListener('ended', stop);
    };
  }, [src]);

  React.useEffect(() => {
    const video = ref.current;
    if (!video) return;
    if (!src) return;
    const wasAutoPlay = wasAutoPlayRef.current;
    wasAutoPlayRef.current = Boolean(autoPlay);

    if (!autoPlay) {
      if (wasAutoPlay) video.pause();
      return;
    }

    if (!wasAutoPlay) void play();
  }, [autoPlay, play, src]);

  return (
    <div
      className="relative overflow-hidden"
      style={{ width: maxWidth, height: maxHeight }}
    >
      <video
        ref={ref}
        loop
        muted={muted}
        playsInline
        preload="auto"
        className={cn(
          'absolute inset-0 block h-full w-full',
          contentFit === 'cover' ? 'object-cover' : 'object-contain',
          showThumbnail ? 'opacity-0' : 'opacity-100'
        )}
      />
      {showThumbnail && (
        <img
          alt=""
          aria-hidden
          src={poster ?? undefined}
          className={cn(
            'pointer-events-none absolute inset-0 h-full w-full',
            contentFit === 'cover' ? 'object-cover' : 'object-contain'
          )}
        />
      )}
      {showLoadingIndicator && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Spinner color={UI.light.contrastForeground} />
        </div>
      )}
    </div>
  );
};
