import { Image } from '@/components/ui/image';
import { cn } from '@/utilities/cn';

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
    className={cn('size-10', className)}
    uri={
      avatar ??
      `https://api.dicebear.com/9.x/glass/png?seed=${id}&backgroundType=gradientLinear&size=250`
    }
    wrapperClassName="rounded-full bg-border"
  />
);
