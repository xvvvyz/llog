import { cn } from '@/utilities/cn';
import { useFileUriToSrc } from '@/utilities/file-uri-to-src';
import {
  ImageContentFit,
  Image as ImagePrimitive,
  ImageStyle,
} from 'expo-image';
import { StyleSheet, View } from 'react-native';

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
  style?: ImageStyle;
  uri?: string | null;
  width?: number;
  wrapperClassName?: string;
}) => {
  const src = useFileUriToSrc(uri);
  const source = src ? { uri: src } : undefined;

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
      <ImagePrimitive
        className={className}
        contentFit={contentFit ?? (fill ? 'cover' : undefined)}
        contentPosition="center"
        source={source}
        style={
          fill
            ? [StyleSheet.absoluteFillObject, style]
            : { height, width, ...style }
        }
      />
    </View>
  );
};
