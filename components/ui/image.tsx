import { cn } from '@/utilities/cn';
import { useFileUriToSrc } from '@/utilities/file-uri-to-src';
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
  style,
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
  style?: StyleProp<ImageStyle>;
  uri?: string | null;
  width?: number;
  wrapperClassName?: string;
}) => {
  const src = useFileUriToSrc(uri);
  const source = src ? { uri: src } : undefined;
  const resolvedClassName = useResolveClassNames(className ?? '');

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
