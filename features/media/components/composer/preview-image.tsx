import { useFileUriToSrc } from '@/features/media/lib/file-uri-to-src';
import * as visualMedia from '@/features/media/lib/visual-media';
import type * as mediaComposer from '@/features/media/types/composer';
import { Spinner } from '@/ui/spinner';
import { Image as ImagePrimitive } from 'expo-image';
import * as React from 'react';
import { StyleSheet, View } from 'react-native';

export const PreviewImage = ({
  item,
  onRemoteReady,
}: {
  item: mediaComposer.VisualPreviewItem;
  onRemoteReady: (mediaId: string) => void;
}) => {
  const remoteSrc = useFileUriToSrc(visualMedia.getThumbnailUri(item));
  const remoteSource = remoteSrc ? { uri: remoteSrc } : null;
  const [isRemoteReady, setIsRemoteReady] = React.useState(false);
  const shouldHoldLocalPreview = item.type === 'image' && !!item.localUri;
  const showRemoteLoadingIndicator = !isRemoteReady && !shouldHoldLocalPreview;

  React.useEffect(() => {
    setIsRemoteReady(false);
  }, [item.id, remoteSrc]);

  const handleRemoteReady = React.useCallback(() => {
    setIsRemoteReady(true);
    if (shouldHoldLocalPreview) onRemoteReady(item.id);
  }, [item.id, onRemoteReady, shouldHoldLocalPreview]);

  return (
    <View className="relative flex-1 bg-card">
      {shouldHoldLocalPreview && (
        <ImagePrimitive
          contentFit="cover"
          contentPosition="center"
          source={{ uri: item.localUri }}
          style={StyleSheet.absoluteFill}
        />
      )}
      {remoteSource && (
        <ImagePrimitive
          contentFit="cover"
          contentPosition="center"
          onDisplay={handleRemoteReady}
          onLoad={handleRemoteReady}
          source={remoteSource}
          style={{
            ...StyleSheet.absoluteFillObject,
            opacity: shouldHoldLocalPreview && !isRemoteReady ? 0 : 1,
          }}
        />
      )}
      {showRemoteLoadingIndicator && (
        <View className="absolute inset-0 pointer-events-none items-center justify-center">
          <Spinner size="xs" />
        </View>
      )}
    </View>
  );
};
