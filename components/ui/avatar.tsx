import { cn } from '@/utilities/cn';
import { Image } from 'expo-image';

export const Avatar = ({
  avatar,
  className,
  id,
}: {
  avatar?: string;
  className?: string;
  id?: string;
}) => (
  <Image
    className={cn('size-11 rounded-full bg-secondary', className)}
    source={
      avatar
        ? `${process.env.EXPO_PUBLIC_API_URL}/files/${avatar}`
        : `https://api.dicebear.com/9.x/glass/svg?seed=${id}&radius=50&backgroundType=gradientLinear`
    }
  />
);
