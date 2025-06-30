import { cn } from '@/utilities/cn';
import { fileUriToSrc } from '@/utilities/file-uri-to-src';
import { View } from 'react-native';

import {
  ImageContentFit,
  Image as ImagePrimitive,
  ImageStyle,
  useImage,
} from 'expo-image';

export const Image = ({
  contentFit,
  height,
  maintainAspectRatio = true,
  maxHeight,
  maxWidth,
  style,
  uri,
  width,
  wrapperClassName,
}: {
  contentFit?: ImageContentFit;
  height?: number;
  maintainAspectRatio?: boolean;
  maxHeight?: number;
  maxWidth?: number;
  style?: ImageStyle;
  uri: string;
  width?: number;
  wrapperClassName?: string;
}) => {
  const image = useImage(fileUriToSrc(uri));

  if (image && (!height || !width)) {
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

  if (width && height && (maxWidth || maxHeight)) {
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
      className={cn('relative overflow-hidden bg-border', wrapperClassName)}
      style={{ borderCurve: 'continuous', height, width }}
    >
      <ImagePrimitive
        contentFit={contentFit}
        source={image}
        style={{ height, width, ...style }}
      />
    </View>
  );
};
