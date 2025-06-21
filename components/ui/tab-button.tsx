import { useBreakpoints } from '@/hooks/use-breakpoints';
import { cn } from '@/utilities/ui/utils';
import { Href, Link, useRouter } from 'expo-router';
import { Button, ButtonProps } from './button';

export const TabButton = ({
  children,
  href,
  onPress,
  ...props
}: ButtonProps & { href: Href }) => {
  const breakpoints = useBreakpoints();
  const router = useRouter();
  const canGoBack = router.canGoBack();

  const button = (
    <Button
      className={cn('h-11', breakpoints.md && 'size-14')}
      onPress={canGoBack ? onPress : undefined}
      size={breakpoints.md ? 'icon' : 'default'}
      variant="link"
      {...props}
    >
      {children}
    </Button>
  );

  if (canGoBack) return button;

  return (
    <Link asChild href={href}>
      {button}
    </Link>
  );
};
