import { cn } from '@/utilities/cn';
import { useFileUriToSrc } from '@/utilities/file-uri-to-src';
import {
  ImageContentFit,
  Image as ImagePrimitive,
  ImageStyle,
  useImage,
} from 'expo-image';
import { View } from 'react-native';

export const Image = ({
  className,
  contentFit,
  fill,
  height,
  maintainAspectRatio = true,
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
  maintainAspectRatio?: boolean;
  maxHeight?: number;
  maxWidth?: number;
  style?: ImageStyle;
  uri: string;
  width?: number;
  wrapperClassName?: string;
}) => {
  const src = useFileUriToSrc(uri);
  const image = useImage(src);

  if (!fill && image && (!height || !width)) {
    const aspectRatio = image.width / image.height;

    if (!width && !height) {
      width = image.width;
      height = image.height;
    } else if (maintainAspectRatio && !width && height) {
      width = height * aspectRatio;
    } else if (maintainAspectRatio && !height && width) {
      height = width / aspectRatio;
    }
  }

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
      className={cn('overflow-hidden bg-border', wrapperClassName)}
      style={
        fill
          ? { borderCurve: 'continuous', flex: 1 }
          : { borderCurve: 'continuous', height, width }
      }
    >
      <ImagePrimitive
        className={className}
        contentFit={fill ? 'cover' : contentFit}
        source={image}
        style={fill ? { flex: 1, ...style } : { height, width, ...style }}
      />
    </View>
  );
};
