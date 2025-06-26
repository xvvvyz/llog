import { Image } from '@/components/ui/image';
import { useImageDimensions } from '@/hooks/use-image-dimensions';
import { Image as ImageType } from '@/types/image';
import { fileUriToSrc } from '@/utilities/file-uri-to-src';
import { View } from 'react-native';

export const ImagesListItem = ({
  image,
  maxHeight,
  maxWidth,
}: {
  image: ImageType;
  maxHeight: number;
  maxWidth: number;
}) => {
  const src = fileUriToSrc(image.uri);
  const windowAspectRatio = maxWidth / maxHeight;
  const { aspectRatio, height, width } = useImageDimensions(src);

  return (
    <View
      className="flex-col items-center justify-center"
      style={{ height: maxHeight, width: maxWidth }}
    >
      <Image
        key={image.id}
        style={
          windowAspectRatio > aspectRatio
            ? { aspectRatio, height: Math.min(height, maxHeight) }
            : { aspectRatio, width: Math.min(width, maxWidth) }
        }
        uri={image.uri}
      />
    </View>
  );
};
