import { Image } from '@/components/ui/image';
import { cn } from '@/utilities/cn';

export const Avatar = ({
  avatar,
  className,
  id,
  size = 40,
}: {
  avatar?: string;
  className?: string;
  id?: string;
  size?: number;
}) => (
  <Image
    height={size}
    uri={
      avatar ??
      `https://api.dicebear.com/9.x/glass/png?seed=${id}&backgroundType=gradientLinear&size=250`
    }
    width={size}
    wrapperClassName={cn('rounded-full', className)}
  />
);
