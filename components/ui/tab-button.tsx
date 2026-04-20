import { Button, ButtonProps } from '@/components/ui/button';
import { useBreakpoints } from '@/hooks/use-breakpoints';
import { cn } from '@/utilities/cn';
import { Href, Link, router } from 'expo-router';
import { StyleSheet } from 'react-native';

export const TabButton = ({
  children,
  href,
  onPress,
  style,
  ...props
}: ButtonProps & { href: Href }) => {
  const breakpoints = useBreakpoints();
  const canGoBack = router.canGoBack();
  const mobileTab = !breakpoints.md;

  const flattenedStyle =
    typeof style === 'function' ? style : StyleSheet.flatten(style);

  const buttonStyle =
    mobileTab &&
    flattenedStyle &&
    typeof flattenedStyle === 'object' &&
    !Array.isArray(flattenedStyle)
      ? (({ flex: _flex, ...restStyle }) => restStyle)(flattenedStyle)
      : flattenedStyle;

  const button = (
    <Button
      className={cn(mobileTab && 'h-11 w-full', breakpoints.md && 'size-14')}
      onPress={canGoBack ? onPress : undefined}
      size={breakpoints.md ? 'icon' : 'default'}
      style={buttonStyle}
      variant="link"
      wrapperClassName={cn(mobileTab && 'flex-1 h-full w-full justify-start')}
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
