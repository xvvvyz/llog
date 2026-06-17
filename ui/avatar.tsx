import { cn } from '@/lib/cn';
import { Image } from '@/ui/image';
import { View } from 'react-native';

const getFallbackAvatarUri = ({
  fallback,
  seed,
}: {
  fallback: 'gradient' | 'neutral';
  seed: string;
}) => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return `${process.env.EXPO_PUBLIC_API_URL}/files/avatars/${fallback}?seed=${seed}`;
  }

  return fallback === 'gradient'
    ? `https://api.dicebear.com/9.x/glass/png?seed=${seed}&backgroundType=gradientLinear&size=64`
    : `https://api.dicebear.com/9.x/notionists-neutral/svg?seed=${seed}&backgroundColor=ffffff&size=64`;
};

export const Avatar = ({
  avatar,
  className,
  fallback = 'neutral',
  id,
  seedId,
  size = 40,
}: {
  avatar?: string;
  className?: string;
  fallback?: 'gradient' | 'neutral';
  id?: string;
  seedId?: string;
  size?: number;
}) => {
  const seed = encodeURIComponent(`${id ?? 'anonymous'}${seedId ?? ''}`);
  const fallbackUri = getFallbackAvatarUri({ fallback, seed });

  return (
    <View
      className={cn('select-none rounded-full shrink-0', className)}
      style={{ height: size, width: size }}
    >
      <Image
        className="rounded-full"
        contentFit="cover"
        fill
        targetSize={size * 3}
        uri={avatar ?? fallbackUri}
        wrapperClassName="overflow-visible rounded-full border-0 bg-transparent"
      />
    </View>
  );
};
