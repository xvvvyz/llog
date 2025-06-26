import { cn } from '@/utilities/cn';
import { fileUriToSrc } from '@/utilities/file-uri-to-src';
import { Image as ImagePrimitive, ImageStyle, View } from 'react-native';

export const Image = ({
  className,
  style,
  uri,
  wrapperClassName,
}: {
  className?: string;
  style?: ImageStyle;
  uri: string;
  wrapperClassName?: string;
}) => {
  const src = fileUriToSrc(uri);

  return (
    <View
      className={cn('overflow-hidden', wrapperClassName)}
      style={{ borderCurve: 'continuous' }}
    >
      <ImagePrimitive
        className={className}
        source={{ uri: src }}
        style={style}
      />
    </View>
  );
};
