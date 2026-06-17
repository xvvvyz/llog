import { useFileUriToSrc } from '@/features/files/lib/file-uri-to-src';
import * as visualMedia from '@/features/files/lib/visual-media';
import type * as fileComposer from '@/features/files/types/composer';
import { Spinner } from '@/ui/spinner';
import { Image as ImagePrimitive } from 'expo-image';
import * as React from 'react';
import { StyleSheet, View } from 'react-native';

export const PreviewImage = ({
  item,
  onRemoteReady,
}: {
  item: fileComposer.VisualPreviewItem;
  onRemoteReady: (fileId: string) => void;
}) => {
  const remoteSrc = useFileUriToSrc(visualMedia.getThumbnailUri(item), {
    targetSize: 192,
  });

  const remoteSource = remoteSrc ? { uri: remoteSrc } : null;
  const [isRemoteReady, setIsRemoteReady] = React.useState(false);
  const shouldHoldLocalPreview = item.type === 'image' && !!item.localUri;

  // Videos get their upload/processing indicator from UploadProgressOverlay, so
  // skip this spinner for them to avoid showing two at once.
  const showRemoteLoadingIndicator =
    !isRemoteReady && !shouldHoldLocalPreview && item.type !== 'video';

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
          draggable={false}
          source={{ uri: item.localUri }}
          style={StyleSheet.absoluteFill}
        />
      )}
      {remoteSource && (
        <ImagePrimitive
          contentFit="cover"
          contentPosition="center"
          draggable={false}
          onDisplay={handleRemoteReady}
          onLoad={handleRemoteReady}
          source={remoteSource}
          style={{
            ...StyleSheet.absoluteFill,
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
