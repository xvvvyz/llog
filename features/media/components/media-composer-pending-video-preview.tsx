import { VideoPlayer } from '@/features/media/components/video-player';
import { useFileUriToSrc } from '@/features/media/lib/file-uri-to-src';
import * as React from 'react';
import { Platform, View } from 'react-native';

const SHEET_MEDIA_PREVIEW_SIZE = 64;
const SHEET_PENDING_VIDEO_OVERFLOW = 16;

export const MediaComposerPendingVideoPreview = ({
  autoPlay,
  height,
  uri,
  width,
}: {
  autoPlay?: boolean;
  height?: number;
  uri: string;
  width?: number;
}) => {
  const src = useFileUriToSrc(uri);

  const coverFrameStyle = React.useMemo(() => {
    if (!width || !height) {
      return {
        height: SHEET_MEDIA_PREVIEW_SIZE + SHEET_PENDING_VIDEO_OVERFLOW,
        width: SHEET_MEDIA_PREVIEW_SIZE + SHEET_PENDING_VIDEO_OVERFLOW,
      };
    }

    const scale = Math.max(
      SHEET_MEDIA_PREVIEW_SIZE / width,
      SHEET_MEDIA_PREVIEW_SIZE / height
    );

    return {
      height: height * scale + SHEET_PENDING_VIDEO_OVERFLOW,
      width: width * scale + SHEET_PENDING_VIDEO_OVERFLOW,
    };
  }, [height, width]);

  if (Platform.OS === 'web') {
    return (
      <View className="overflow-hidden h-full w-full bg-card">
        <video
          autoPlay={autoPlay}
          className="block object-cover h-full w-full"
          loop
          muted
          playsInline
          preload="metadata"
          src={src ?? undefined}
        />
      </View>
    );
  }

  return (
    <View className="overflow-hidden h-full w-full bg-card items-center justify-center">
      <View style={coverFrameStyle}>
        <VideoPlayer
          autoPlay={autoPlay}
          contentFit="cover"
          maxHeight={coverFrameStyle.height}
          maxWidth={coverFrameStyle.width}
          muted
          uri={uri}
        />
      </View>
    </View>
  );
};
