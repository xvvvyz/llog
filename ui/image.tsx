import { useFileUriToSrc } from '@/features/media/lib/file-uri-to-src';
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
  style,
  targetHeight,
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
  style?: StyleProp<ImageStyle>;
  targetHeight?: number;
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

  const src = useFileUriToSrc(uri, { quality, targetHeight, targetWidth });
  const source = src ? { uri: src } : undefined;
  const resolvedClassName = useResolveClassNames(className ?? '');

  return (
    <View
      className={cn(
        'bg-border overflow-hidden',
        fill && 'relative flex-1 self-stretch',
        wrapperClassName
      )}
      style={
        fill
          ? { borderCurve: 'continuous' }
          : { borderCurve: 'continuous', height, width }
      }
    >
      <ExpoImage
        contentFit={contentFit ?? (fill ? 'cover' : undefined)}
        contentPosition="center"
        onDisplay={onDisplay}
        onLoad={onLoad}
        source={source}
        style={
          fill
            ? [resolvedClassName, StyleSheet.absoluteFillObject, style]
            : [resolvedClassName, { height, width }, style]
        }
      />
    </View>
  );
};
