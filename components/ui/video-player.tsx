import { fileUriToSrc } from '@/utilities/file-uri-to-src';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useImperativeHandle, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

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
  muted = true,
  nativeControls = false,
  onFullscreenReady,
  onPlayingChange,
  uri,
}: {
  autoPlay?: boolean;
  handleRef?: React.Ref<VideoPlayerHandle>;
  maxHeight?: number;
  maxWidth?: number;
  muted?: boolean;
  nativeControls?: boolean;
  onFullscreenReady?: (enterFullscreen: () => void) => void;
  onPlayingChange?: (isPlaying: boolean) => void;
  uri: string;
}) => {
  const source = fileUriToSrc(uri);
  const videoViewRef = useRef<VideoView>(null);
  const [isBuffering, setIsBuffering] = useState(true);

  const player = useVideoPlayer(source, (player) => {
    player.loop = true;
    player.muted = muted;
    if (autoPlay) player.play();
  });

  useImperativeHandle(handleRef, () => ({
    play: () => player.play(),
    toggleMute: () => {
      player.muted = !player.muted;
      return player.muted;
    },
    togglePlay: () => {
      if (player.playing) {
        player.pause();
        return false;
      } else {
        player.play();
        return true;
      }
    },
  }));

  useEffect(() => {
    const statusSub = player.addListener('statusChange', ({ status }) => {
      setIsBuffering(status === 'loading');
    });

    const playingSub = onPlayingChange
      ? player.addListener('playingChange', ({ isPlaying }) => {
          onPlayingChange(isPlaying);
        })
      : null;

    return () => {
      statusSub.remove();
      playingSub?.remove();
    };
  }, [player, onPlayingChange]);

  useEffect(() => {
    if (!onFullscreenReady) return;
    onFullscreenReady(() => videoViewRef.current?.enterFullscreen());
  }, [onFullscreenReady]);

  return (
    <View style={{ width: maxWidth, height: maxHeight }}>
      <VideoView
        contentFit="contain"
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
