import { fileUriToSrc } from '@/utilities/file-uri-to-src';
import { useVideoPlayer, VideoView } from 'expo-video';
import { View } from 'react-native';

export const VideoPlayer = ({
  maxHeight,
  maxWidth,
  uri,
}: {
  maxHeight?: number;
  maxWidth?: number;
  uri: string;
}) => {
  const source = fileUriToSrc(uri);
  const player = useVideoPlayer(source, (player) => {
    player.loop = true;
  });

  return (
    <View style={{ width: maxWidth, height: maxHeight }}>
      <VideoView contentFit="contain" player={player} style={{ flex: 1 }} />
    </View>
  );
};
