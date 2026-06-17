import { VideoPlayer } from '@/features/files/components/video-player';
import { useFileUriToSrc } from '@/features/files/lib/file-uri-to-src';
import { cn } from '@/lib/cn';
import { Platform, View } from 'react-native';

// Previews a not-yet-uploaded video straight from its local uri. The shared
// VideoPlayer streams through HLS, which can't read a local file, so on web we
// fall back to a plain <video> pointed at the local source. It plays a muted
// loop so the frame reliably paints (a paused <video> often stays blank). On
// native the VideoPlayer already handles local uris.
export const LocalVideoPreview = ({
  autoPlay,
  contentFit = 'contain',
  maxHeight,
  maxWidth,
  uri,
}: {
  autoPlay?: boolean;
  contentFit?: 'contain' | 'cover';
  maxHeight?: number;
  maxWidth?: number;
  uri?: string | null;
}) => {
  const src = useFileUriToSrc(uri);

  if (Platform.OS === 'web') {
    return (
      <View className="overflow-hidden h-full w-full">
        <video
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          src={src ?? undefined}
          className={cn(
            'block h-full w-full',
            contentFit === 'cover' ? 'object-cover' : 'object-contain'
          )}
        />
      </View>
    );
  }

  return (
    <VideoPlayer
      autoPlay={autoPlay}
      contentFit={contentFit}
      maxHeight={maxHeight}
      maxWidth={maxWidth}
      muted
      uri={uri}
    />
  );
};
