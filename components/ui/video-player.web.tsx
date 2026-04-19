import { useExclusiveMediaPlayback } from '@/hooks/use-exclusive-media-playback';
import { useFileUriToSrc } from '@/utilities/file-uri-to-src';
import * as React from 'react';
import { ActivityIndicator } from 'react-native';

export interface VideoPlayerHandle {
  play: () => void;
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
  onFullscreenReady,
  onPlayingChange,
  uri,
}: {
  autoPlay?: boolean;
  contentFit?: 'contain' | 'cover';
  handleRef?: React.Ref<VideoPlayerHandle>;
  maxHeight?: number;
  maxWidth?: number;
  muted?: boolean;
  nativeControls?: boolean;
  onFullscreenReady?: (enterFullscreen: () => void) => void;
  onPlayingChange?: (isPlaying: boolean) => void;
  uri: string;
}) => {
  const src = useFileUriToSrc(uri);
  const ref = React.useRef<HTMLVideoElement>(null);

  const pausePlayback = React.useCallback(() => {
    ref.current?.pause();
  }, []);

  const { claimPlayback, releasePlayback } =
    useExclusiveMediaPlayback(pausePlayback);

  const [size, setSize] = React.useState<{
    width: number;
    height: number;
  } | null>(null);

  const [isBuffering, setIsBuffering] = React.useState(true);

  const play = React.useCallback(async () => {
    const video = ref.current;
    if (!video) return;

    try {
      await claimPlayback();
      await video.play();
    } catch {
      releasePlayback();
    }
  }, [claimPlayback, releasePlayback]);

  React.useImperativeHandle(handleRef, () => ({
    play: () => {
      void play();
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
    if (contentFit === 'cover') {
      setSize(null);
      return;
    }

    const video = ref.current;
    if (!video) return;

    const onMetadata = () => {
      const vw = video.videoWidth;
      const vh = video.videoHeight;
      if (!vw || !vh || !maxWidth || !maxHeight) return;
      const scale = Math.min(maxWidth / vw, maxHeight / vh, 1);

      setSize({
        width: Math.round(vw * scale),
        height: Math.round(vh * scale),
      });
    };

    video.addEventListener('loadedmetadata', onMetadata);
    if (video.readyState >= 1) onMetadata();

    return () => video.removeEventListener('loadedmetadata', onMetadata);
  }, [contentFit, maxWidth, maxHeight]);

  React.useEffect(() => {
    const video = ref.current;
    if (!video) return;

    const onWaiting = () => setIsBuffering(true);
    const onPlaying = () => setIsBuffering(false);
    const onCanPlay = () => setIsBuffering(false);

    video.addEventListener('waiting', onWaiting);
    video.addEventListener('playing', onPlaying);
    video.addEventListener('canplay', onCanPlay);

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
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
    };
  }, [claimPlayback, onPlayingChange, releasePlayback]);

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
  }, []);

  React.useEffect(() => {
    if (autoPlay && (contentFit === 'cover' || size) && ref.current) {
      void play();
    }
  }, [autoPlay, contentFit, play, size]);

  React.useEffect(() => {
    const video = ref.current;
    if (!video || !onFullscreenReady) return;

    const onFullscreenChange = () => {
      if (!document.fullscreenElement) video.controls = false;
    };

    const webkitVideo = video as HTMLVideoElement & {
      webkitDisplayingFullscreen?: boolean;
      webkitEnterFullscreen?: () => void;
    };

    const onWebkitFullscreenChange = () => {
      if (!webkitVideo.webkitDisplayingFullscreen) video.controls = false;
    };

    document.addEventListener('fullscreenchange', onFullscreenChange);
    video.addEventListener('webkitendfullscreen', onWebkitFullscreenChange);

    onFullscreenReady(() => {
      video.controls = true;

      if (webkitVideo.webkitEnterFullscreen) {
        webkitVideo.webkitEnterFullscreen();
      } else {
        video.requestFullscreen?.();
      }
    });

    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);

      video.removeEventListener(
        'webkitendfullscreen',
        onWebkitFullscreenChange
      );
    };
  }, [onFullscreenReady]);

  return (
    <div
      style={{
        position: 'relative',
        ...(size ?? { width: maxWidth, height: maxHeight }),
      }}
    >
      <video
        ref={ref}
        muted={muted}
        playsInline
        preload="metadata"
        src={src}
        style={
          contentFit === 'cover'
            ? {
                display: 'block',
                width: maxWidth,
                height: maxHeight,
                objectFit: 'cover',
              }
            : size
              ? { display: 'block', width: size.width, height: size.height }
              : { position: 'absolute', width: 0, height: 0, opacity: 0 }
        }
      />
      {isBuffering && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ActivityIndicator color="white" />
        </div>
      )}
    </div>
  );
};
