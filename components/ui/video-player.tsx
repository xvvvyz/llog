import { useExclusiveMediaPlayback } from '@/hooks/use-exclusive-media-playback';
import { useFileUriToSrc } from '@/utilities/file-uri-to-src';
import { useVideoPlayer, VideoView } from 'expo-video';
import * as React from 'react';
import { ActivityIndicator, View } from 'react-native';

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
  nativeControls = false,
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
  const source = useFileUriToSrc(uri);
  const videoViewRef = React.useRef<VideoView>(null);
  const [isBuffering, setIsBuffering] = React.useState(true);

  const player = useVideoPlayer(source, (player) => {
    player.loop = true;
    player.muted = muted;
  });

  const pausePlayback = React.useCallback(() => {
    player.pause();
  }, [player]);

  const { claimPlayback, releasePlayback } =
    useExclusiveMediaPlayback(pausePlayback);

  const startPlayback = React.useCallback(async () => {
    await claimPlayback();
    player.play();
  }, [claimPlayback, player]);

  React.useImperativeHandle(handleRef, () => ({
    play: () => {
      void startPlayback();
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
    const statusSub = player.addListener('statusChange', ({ status }) => {
      setIsBuffering(status === 'loading');
    });

    const playingSub = player.addListener('playingChange', ({ isPlaying }) => {
      if (isPlaying) {
        void claimPlayback();
      } else {
        releasePlayback();
      }

      onPlayingChange?.(isPlaying);
    });

    return () => {
      statusSub.remove();
      playingSub.remove();
    };
  }, [claimPlayback, onPlayingChange, player, releasePlayback]);

  React.useEffect(() => {
    if (!autoPlay) return;
    void startPlayback();
  }, [autoPlay, startPlayback]);

  React.useEffect(() => {
    if (!onFullscreenReady) return;
    onFullscreenReady(() => videoViewRef.current?.enterFullscreen());
  }, [onFullscreenReady]);

  return (
    <View style={{ width: maxWidth, height: maxHeight }}>
      <VideoView
        contentFit={contentFit}
        nativeControls={nativeControls}
        player={player}
        ref={videoViewRef}
        style={{ flex: 1 }}
      />
      {isBuffering && (
        <View
          style={{
            position: 'absolute',
            inset: 0,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ActivityIndicator color="white" />
        </View>
      )}
    </View>
  );
};
