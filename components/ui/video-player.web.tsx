import { fileUriToSrc } from '@/utilities/file-uri-to-src';
import { useEffect, useImperativeHandle, useRef, useState } from 'react';
import { ActivityIndicator } from 'react-native';

export interface VideoPlayerHandle {
  play: () => void;
  toggleMute: () => boolean;
  togglePlay: () => boolean;
}

export const VideoPlayer = ({
  autoPlay,
  handleRef,
  maxHeight,
  maxWidth,
  onFullscreenReady,
  uri,
}: {
  autoPlay?: boolean;
  handleRef?: React.Ref<VideoPlayerHandle>;
  maxHeight?: number;
  maxWidth?: number;
  nativeControls?: boolean;
  onFullscreenReady?: (enterFullscreen: () => void) => void;
  uri: string;
}) => {
  const src = fileUriToSrc(uri);
  const ref = useRef<HTMLVideoElement>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(
    null
  );
  const [isBuffering, setIsBuffering] = useState(true);

  useImperativeHandle(handleRef, () => ({
    play: () => {
      ref.current?.play().catch(() => {});
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
        video.play().catch(() => {});
        return true;
      } else {
        video.pause();
        return false;
      }
    },
  }));

  useEffect(() => {
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
  }, [maxWidth, maxHeight]);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;

    const onWaiting = () => setIsBuffering(true);
    const onPlaying = () => setIsBuffering(false);
    const onCanPlay = () => setIsBuffering(false);

    video.addEventListener('waiting', onWaiting);
    video.addEventListener('playing', onPlaying);
    video.addEventListener('canplay', onCanPlay);

    return () => {
      video.removeEventListener('waiting', onWaiting);
      video.removeEventListener('playing', onPlaying);
      video.removeEventListener('canplay', onCanPlay);
    };
  }, []);

  useEffect(() => {
    if (autoPlay && size && ref.current) {
      ref.current.play().catch(() => {});
    }
  }, [autoPlay, size]);

  useEffect(() => {
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
    <div style={{ position: 'relative', ...(size ?? {}) }}>
      <video
        ref={ref}
        loop
        muted
        playsInline
        preload={autoPlay ? 'auto' : 'none'}
        src={src}
        style={
          size
            ? { display: 'block', width: size.width, height: size.height }
            : { position: 'absolute', width: 0, height: 0, opacity: 0 }
        }
      />
      {isBuffering && size && (
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
