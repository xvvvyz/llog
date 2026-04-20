import { useExclusiveMediaPlayback } from '@/hooks/use-exclusive-media-playback';
import { useFileUriToSrc } from '@/utilities/file-uri-to-src';
import HlsClient, { Events as HlsEvents } from 'hls.js';
import * as React from 'react';
import { ActivityIndicator } from 'react-native';

export interface VideoPlayerHandle {
  pause: () => void;
  play: () => void;
  seekTo: (seconds: number) => void;
  setScrubbingEnabled: (enabled: boolean) => void;
  toggleMute: () => boolean;
  togglePlay: () => boolean;
}

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
  const src = useFileUriToSrc(uri);
  const poster = useFileUriToSrc(thumbnailUri);
  const ref = React.useRef<HTMLVideoElement>(null);

  const pausePlayback = React.useCallback(() => {
    ref.current?.pause();
  }, []);

  const { claimPlayback, releasePlayback } =
    useExclusiveMediaPlayback(pausePlayback);

  const [isBuffering, setIsBuffering] = React.useState(true);

  const [hasRenderedFirstFrame, setHasRenderedFirstFrame] =
    React.useState(false);

  const rafRef = React.useRef<number>(0);
  const scrubbingEnabledRef = React.useRef(false);
  const lastScrubSeekAtRef = React.useRef(0);
  const lastScrubSeekTargetRef = React.useRef<number | null>(null);

  const showThumbnail =
    Boolean(poster) && (isBuffering || !hasRenderedFirstFrame);

  React.useEffect(() => {
    setIsBuffering(Boolean(src));
    setHasRenderedFirstFrame(false);
    onTimeChange?.(0, 0);
  }, [onTimeChange, src]);

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
      } else {
        lastScrubSeekTargetRef.current = seconds;
        video.currentTime = seconds;
      }

      onTimeChange?.(video.currentTime, video.duration);
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

      const startPlayback = () => {
        if (!autoPlay) return;
        void play();
      };

      hls.on(HlsEvents.MEDIA_ATTACHED, () => {
        hls.loadSource(src);
      });

      hls.on(HlsEvents.MANIFEST_PARSED, () => {
        setIsBuffering(false);
        startPlayback();
      });

      hls.on(HlsEvents.ERROR, (_, data) => {
        if (data.fatal) {
          setIsBuffering(false);
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
  }, [autoPlay, play, releasePlayback, src]);

  React.useEffect(() => {
    const video = ref.current;
    if (!video) return;
    if (!src) return;

    const onWaiting = () => setIsBuffering(true);

    const onPlaying = () => {
      setIsBuffering(false);
      setHasRenderedFirstFrame(true);
    };

    const onCanPlay = () => setIsBuffering(false);

    const onLoadedData = () => {
      setIsBuffering(false);
      setHasRenderedFirstFrame(true);
      syncTime();
    };

    const syncTime = () => {
      onTimeChange?.(
        Number.isFinite(video.currentTime) ? video.currentTime : 0,
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
      onPlayingChange?.(true);
    };

    const onPause = () => {
      releasePlayback();
      onPlayingChange?.(false);
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
  }, [claimPlayback, onPlayingChange, onTimeChange, releasePlayback, src]);

  React.useEffect(() => {
    const video = ref.current;
    if (!video || !src) return;

    const tick = () => {
      onTimeChange?.(
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

    if (!video.paused) {
      rafRef.current = requestAnimationFrame(tick);
    }

    return () => {
      stop();
      video.removeEventListener('play', start);
      video.removeEventListener('pause', stop);
      video.removeEventListener('ended', stop);
    };
  }, [onTimeChange, src]);

  React.useEffect(() => {
    const video = ref.current;
    if (!video) return;

    const onEnded = async () => {
      video.currentTime = 0;

      try {
        await video.play();
      } catch {
        // noop
      }
    };

    video.addEventListener('ended', onEnded);
    return () => video.removeEventListener('ended', onEnded);
  }, [src]);

  React.useEffect(() => {
    if (src && autoPlay) {
      void play();
    }
  }, [autoPlay, play, src]);

  return (
    <div
      className="relative overflow-hidden"
      style={{ width: maxWidth, height: maxHeight }}
    >
      <video
        className="absolute inset-0 block h-full w-full"
        ref={ref}
        muted={muted}
        poster={poster ?? undefined}
        playsInline
        preload="metadata"
        style={{
          opacity: showThumbnail ? 0 : 1,
          objectFit: contentFit,
        }}
      />
      {showThumbnail && (
        <img
          alt=""
          aria-hidden
          className="pointer-events-none absolute inset-0 h-full w-full"
          src={poster ?? undefined}
          style={{
            objectFit: contentFit,
          }}
        />
      )}
      {isBuffering && (
        <div className="absolute inset-0 flex items-center justify-center">
          <ActivityIndicator color="white" />
        </div>
      )}
    </div>
  );
};
