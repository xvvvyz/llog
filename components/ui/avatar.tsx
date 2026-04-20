import { Image } from '@/components/ui/image';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { cn } from '@/utilities/cn';

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
  const colorScheme = useColorScheme();
  const seed = encodeURIComponent(`${id ?? 'anonymous'}${seedId ?? ''}`);

  const fallbackUri =
    fallback === 'gradient'
      ? `https://api.dicebear.com/9.x/glass/png?seed=${seed}&backgroundType=gradientLinear&size=64`
      : `https://api.dicebear.com/9.x/notionists-neutral/svg?seed=${seed}&size=64`;

  return (
    <Image
      height={size}
      uri={avatar ?? fallbackUri}
      width={size}
      wrapperClassName={cn(
        'select-none rounded-full',
        !avatar && colorScheme === 'dark' && 'opacity-80',
        className
      )}
    />
  );
};
