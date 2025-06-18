import { cn } from '@/utilities/ui/utils';
import { Image } from 'expo-image';
import { View } from 'react-native';

export const Avatar = ({
  avatar,
  className,
  height,
  id,
  width,
}: {
  avatar?: string;
  className?: string;
  height: number;
  id?: string;
  width: number;
}) => (
  <View
    className={cn('overflow-hidden rounded-full bg-border', className)}
    style={{ height, width }}
  >
    <Image
      source={
        avatar
          ? `${process.env.EXPO_PUBLIC_API_URL}/files/${avatar}`
          : `https://api.dicebear.com/9.x/glass/png?seed=${id}&backgroundType=gradientLinear&size=${width}`
      }
      style={{ height, width }}
    />
  </View>
);
