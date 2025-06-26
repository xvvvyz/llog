import { Image } from '@/components/ui/image';
import { useImageDimensions } from '@/hooks/use-image-dimensions';
import { ComponentProps } from 'react';

export const RatioImage = ({
  style,
  uri,
  ...props
}: ComponentProps<typeof Image>) => {
  const { aspectRatio } = useImageDimensions(uri);
  return <Image style={{ aspectRatio, ...style }} uri={uri} {...props} />;
};
