import { LocalVideoPreview } from '@/features/files/components/local-video-preview';
import * as React from 'react';
import { Platform, View } from 'react-native';

const SHEET_MEDIA_PREVIEW_SIZE = 64;
const SHEET_PENDING_VIDEO_OVERFLOW = 16;

export const PendingVideoPreview = ({
  autoPlay,
  height,
  uri,
  width,
}: {
  autoPlay?: boolean;
  height?: number;
  uri?: string | null;
  width?: number;
}) => {
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
        <LocalVideoPreview autoPlay={autoPlay} contentFit="cover" uri={uri} />
      </View>
    );
  }

  return (
    <View className="overflow-hidden h-full w-full bg-card items-center justify-center">
      <View style={coverFrameStyle}>
        <LocalVideoPreview
          autoPlay={autoPlay}
          contentFit="cover"
          maxHeight={coverFrameStyle.height}
          maxWidth={coverFrameStyle.width}
          uri={uri}
        />
      </View>
    </View>
  );
};
