import { Image } from '@/components/ui/image';
import { useExclusiveMediaPlayback } from '@/hooks/use-exclusive-media-playback';
import { useFileUriToSrc } from '@/utilities/file-uri-to-src';
import { useVideoPlayer, VideoView } from 'expo-video';
import * as React from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';

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
  nativeControls = false,
  onFullscreenReady,
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
  nativeControls?: boolean;
  onFullscreenReady?: (enterFullscreen: () => void) => void;
  onPlayingChange?: (isPlaying: boolean) => void;
  onTimeChange?: (currentTime: number, duration: number) => void;
  thumbnailUri?: string | null;
  uri: string;
}) => {
  const source = useFileUriToSrc(uri);
  const videoViewRef = React.useRef<VideoView>(null);
  const [isBuffering, setIsBuffering] = React.useState(Boolean(source));

  const [hasRenderedFirstFrame, setHasRenderedFirstFrame] =
    React.useState(false);
  const showThumbnail =
    Boolean(thumbnailUri) && (isBuffering || !hasRenderedFirstFrame);

  const player = useVideoPlayer(source, (player) => {
    player.loop = true;
    player.muted = muted;
    player.timeUpdateEventInterval = 1 / 60;
    player.seekTolerance = { toleranceAfter: 0, toleranceBefore: 0 };
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
      player.currentTime = seconds;
      onTimeChange?.(player.currentTime, player.duration);
    },
    setScrubbingEnabled: (enabled: boolean) => {
      player.scrubbingModeOptions = {
        scrubbingModeEnabled: enabled,
      };
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
    player.muted = muted;
  }, [muted, player]);

  React.useEffect(() => {
    setIsBuffering(Boolean(source));
    setHasRenderedFirstFrame(false);
    onTimeChange?.(0, 0);
  }, [onTimeChange, source, thumbnailUri]);

  React.useEffect(() => {
    if (!source) {
      setIsBuffering(false);
      return;
    }

    const statusSub = player.addListener('statusChange', ({ status }) => {
      setIsBuffering(status === 'loading');
    });

    const playingSub = player.addListener('playingChange', ({ isPlaying }) => {
      if (isPlaying) void claimPlayback();
      else releasePlayback();
      onPlayingChange?.(isPlaying);
    });

    const sourceLoadSub = player.addListener('sourceLoad', ({ duration }) => {
      onTimeChange?.(player.currentTime, duration);
    });

    const timeUpdateSub = player.addListener('timeUpdate', ({ currentTime }) =>
      onTimeChange?.(currentTime, player.duration)
    );

    return () => {
      statusSub.remove();
      playingSub.remove();
      sourceLoadSub.remove();
      timeUpdateSub.remove();
    };
  }, [
    claimPlayback,
    onPlayingChange,
    onTimeChange,
    player,
    releasePlayback,
    source,
  ]);

  React.useEffect(() => {
    if (!autoPlay) return;
    void startPlayback();
  }, [autoPlay, startPlayback]);

  React.useEffect(() => {
    if (!onFullscreenReady) return;
    onFullscreenReady(() => videoViewRef.current?.enterFullscreen());
  }, [onFullscreenReady]);

  return (
    <View
      className="overflow-hidden"
      style={{ width: maxWidth, height: maxHeight }}
    >
      <VideoView
        contentFit={contentFit}
        nativeControls={nativeControls}
        onFirstFrameRender={() => setHasRenderedFirstFrame(true)}
        player={player}
        ref={videoViewRef}
        surfaceType={Platform.OS === 'android' ? 'textureView' : undefined}
        style={[StyleSheet.absoluteFill, showThumbnail && { opacity: 0 }]}
      />
      {showThumbnail && (
        <View className="pointer-events-none" style={StyleSheet.absoluteFill}>
          <Image fill contentFit={contentFit} uri={thumbnailUri} />
        </View>
      )}
      {isBuffering && (
        <View className="absolute inset-0 items-center justify-center">
          <ActivityIndicator color="white" />
        </View>
      )}
    </View>
  );
};
