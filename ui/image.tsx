import { useFileUriToSrc } from '@/domain/files/uri';
import { cn } from '@/lib/cn';
import { Image as ExpoImage, ImageContentFit, ImageStyle } from 'expo-image';
import { StyleProp, StyleSheet, View } from 'react-native';
import { useResolveClassNames } from 'uniwind';

export const Image = ({
  className,
  contentFit,
  fill,
  height,
  maxHeight,
  maxWidth,
  onDisplay,
  onLoad,
  quality,
  src,
  style,
  targetHeight,
  targetSize,
  targetWidth,
  uri,
  width,
  wrapperClassName,
}: {
  className?: string;
  contentFit?: ImageContentFit;
  fill?: boolean;
  height?: number;
  maxHeight?: number;
  maxWidth?: number;
  onDisplay?: () => void;
  onLoad?: () => void;
  quality?: number;
  src?: string | null;
  style?: StyleProp<ImageStyle>;
  targetHeight?: number;
  targetSize?: number;
  targetWidth?: number;
  uri?: string | null;
  width?: number;
  wrapperClassName?: string;
}) => {
  if (!fill && width && height && (maxWidth || maxHeight)) {
    const aspectRatio = width / height;

    if (maxWidth && width > maxWidth) {
      width = maxWidth;
      height = width / aspectRatio;
    }

    if (maxHeight && height > maxHeight) {
      height = maxHeight;
      width = height * aspectRatio;
    }
  }

  const resolvedSrc = useFileUriToSrc(uri, {
    quality,
    targetHeight,
    targetSize,
    targetWidth,
  });

  const sourceSrc = src === undefined ? resolvedSrc : src;
  const source = sourceSrc ? { uri: sourceSrc } : undefined;
  const resolvedClassName = useResolveClassNames(className ?? '');

  return (
    <View
      style={fill ? undefined : { height, width }}
      className={cn(
        'bg-border overflow-hidden border-continuous',
        fill && 'relative flex-1 self-stretch',
        wrapperClassName
      )}
    >
      <ExpoImage
        contentFit={contentFit ?? (fill ? 'cover' : undefined)}
        contentPosition="center"
        onDisplay={onDisplay}
        onLoad={onLoad}
        source={source}
        style={
          fill
            ? [resolvedClassName, StyleSheet.absoluteFill, style]
            : [resolvedClassName, { height, width }, style]
        }
      />
    </View>
  );
};
