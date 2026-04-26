import { useRippleColor } from '@/hooks/use-ripple-color';
import { cn } from '@/lib/cn';
import { TextContext } from '@/ui/text';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

const buttonWrapperVariants = cva('overflow-hidden rounded-xl', {
  defaultVariants: { size: 'default', variant: 'default' },
  variants: {
    size: {
      default: '',
      icon: '',
      'icon-sm': 'rounded-lg',
      lg: '',
      sm: '',
      xs: 'rounded-lg',
    },
    variant: {
      default: '',
      destructive: '',
      ghost: '',
      link: 'rounded-none',
      outline: '',
      secondary: '',
    },
  },
});

const buttonVariants = cva(
  'group flex-row items-center rounded-xl gap-3 justify-center web:transition-opacity web:transition-colors web:focus-visible:outline-hidden',
  {
    defaultVariants: { size: 'default', variant: 'default' },
    variants: {
      size: {
        default: 'h-11 px-4 py-2',
        icon: 'h-11 w-11',
        'icon-sm': 'h-8 w-8 rounded-lg',
        lg: 'h-12 px-5',
        sm: 'h-10 px-4',
        xs: 'h-8 px-2 rounded-lg gap-2',
      },
      variant: {
        default: 'bg-primary web:hover:bg-primary/80 active:bg-primary/60',
        destructive:
          'bg-destructive web:hover:bg-destructive/80 active:bg-destructive/60',
        ghost: 'web:hover:bg-accent active:bg-accent',
        link: 'p-0 h-auto w-auto rounded-none',
        outline:
          'bg-none web:hover:bg-accent active:bg-accent border border-border',
        secondary:
          'bg-secondary web:hover:opacity-80 active:opacity-60 border border-border-secondary',
      },
    },
  }
);

const buttonTextVariants = cva(
  'web:whitespace-nowrap leading-5 font-medium text-foreground web:transition-colors',
  {
    defaultVariants: { size: 'default', variant: 'default' },
    variants: {
      size: {
        default: '',
        icon: '',
        'icon-sm': '',
        lg: '',
        sm: '',
        xs: 'text-sm',
      },
      variant: {
        default: 'text-primary-foreground',
        destructive: 'text-destructive-foreground',
        ghost: 'text-muted-foreground',
        link: '',
        outline: '',
        secondary: 'text-secondary-foreground',
      },
    },
  }
);

type ButtonProps = React.ComponentPropsWithoutRef<typeof Pressable> &
  VariantProps<typeof buttonVariants> & {
    pressOnWebTouchRelease?: boolean;
    ripple?: 'default' | 'inverse';
    wrapperClassName?: string;
  };

type ButtonTouchEvent = Parameters<NonNullable<ButtonProps['onTouchStart']>>[0];
type ButtonPressEvent = Parameters<NonNullable<ButtonProps['onPress']>>[0];
type TouchPoint = { x: number; y: number };
const TOUCH_CANCEL_DISTANCE = 16;
const SKIP_PRESS_RESET_MS = 500;

const readTouchPoint = (event: ButtonTouchEvent): TouchPoint | null => {
  const nativeEvent = event.nativeEvent as {
    changedTouches?: Array<{
      clientX?: unknown;
      clientY?: unknown;
      pageX?: unknown;
      pageY?: unknown;
    }>;
    pageX?: unknown;
    pageY?: unknown;
    touches?: Array<{
      clientX?: unknown;
      clientY?: unknown;
      pageX?: unknown;
      pageY?: unknown;
    }>;
  };

  const touch = nativeEvent.changedTouches?.[0] ?? nativeEvent.touches?.[0];
  const x = touch?.clientX ?? touch?.pageX ?? nativeEvent.pageX;
  const y = touch?.clientY ?? touch?.pageY ?? nativeEvent.pageY;
  return typeof x === 'number' && typeof y === 'number' ? { x, y } : null;
};

const preventFollowUpClick = (event: ButtonTouchEvent) => {
  event.preventDefault?.();
  event.stopPropagation?.();

  const nativeEvent = event.nativeEvent as {
    preventDefault?: () => void;
    stopPropagation?: () => void;
  };

  nativeEvent.preventDefault?.();
  nativeEvent.stopPropagation?.();
};

const Button = React.forwardRef<
  React.ComponentRef<typeof Pressable>,
  ButtonProps
>(
  (
    {
      className,
      disabled,
      onPress,
      pressOnWebTouchRelease,
      onTouchCancel,
      onTouchEnd,
      onTouchStart,
      ripple,
      size,
      style,
      variant,
      wrapperClassName,
      ...props
    },
    ref
  ) => {
    const skipNextPressRef = React.useRef(false);

    const skipPressResetTimeoutRef = React.useRef<ReturnType<
      typeof setTimeout
    > | null>(null);

    const touchStartRef = React.useRef<TouchPoint | null>(null);

    const rippleColor = useRippleColor(
      ripple ??
        (variant === 'ghost' || variant === 'outline' || variant === 'secondary'
          ? 'inverse'
          : 'default')
    );

    const shouldHaveRipple = variant !== 'link';
    const shouldPressOnWebTouchRelease = pressOnWebTouchRelease ?? true;

    const clearSkipPressResetTimeout = React.useCallback(() => {
      if (!skipPressResetTimeoutRef.current) return;
      clearTimeout(skipPressResetTimeoutRef.current);
      skipPressResetTimeoutRef.current = null;
    }, []);

    React.useEffect(
      () => clearSkipPressResetTimeout,
      [clearSkipPressResetTimeout]
    );

    const markNextPressHandled = React.useCallback(() => {
      clearSkipPressResetTimeout();
      skipNextPressRef.current = true;

      skipPressResetTimeoutRef.current = setTimeout(() => {
        skipNextPressRef.current = false;
        skipPressResetTimeoutRef.current = null;
      }, SKIP_PRESS_RESET_MS);
    }, [clearSkipPressResetTimeout]);

    const handlePress = React.useCallback(
      (event: ButtonPressEvent) => {
        if (skipNextPressRef.current) {
          skipNextPressRef.current = false;
          clearSkipPressResetTimeout();
          return;
        }

        onPress?.(event);
      },
      [clearSkipPressResetTimeout, onPress]
    );

    const handleTouchStart = React.useCallback(
      (event: ButtonTouchEvent) => {
        onTouchStart?.(event);

        if (
          !shouldPressOnWebTouchRelease ||
          Platform.OS !== 'web' ||
          disabled ||
          !onPress
        ) {
          touchStartRef.current = null;
          return;
        }

        touchStartRef.current = readTouchPoint(event);
      },
      [disabled, onPress, onTouchStart, shouldPressOnWebTouchRelease]
    );

    const handleTouchEnd = React.useCallback(
      (event: ButtonTouchEvent) => {
        onTouchEnd?.(event);
        const start = touchStartRef.current;
        touchStartRef.current = null;

        if (
          !shouldPressOnWebTouchRelease ||
          Platform.OS !== 'web' ||
          disabled ||
          !onPress ||
          !start
        ) {
          return;
        }

        const end = readTouchPoint(event) ?? start;
        const distance = Math.hypot(end.x - start.x, end.y - start.y);
        if (distance > TOUCH_CANCEL_DISTANCE) return;
        preventFollowUpClick(event);
        markNextPressHandled();
        onPress(event as unknown as ButtonPressEvent);
      },
      [
        disabled,
        markNextPressHandled,
        onPress,
        onTouchEnd,
        shouldPressOnWebTouchRelease,
      ]
    );

    const handleTouchCancel = React.useCallback(
      (event: ButtonTouchEvent) => {
        touchStartRef.current = null;
        onTouchCancel?.(event);
      },
      [onTouchCancel]
    );

    const shouldHandleTouchRelease =
      shouldPressOnWebTouchRelease ||
      !!onTouchStart ||
      !!onTouchEnd ||
      !!onTouchCancel;

    return (
      <TextContext.Provider value={buttonTextVariants({ size, variant })}>
        <View
          style={{ borderCurve: 'continuous' }}
          className={cn(
            buttonWrapperVariants({ size, variant }),
            disabled && 'opacity-50',
            wrapperClassName
          )}
        >
          <Pressable
            ref={ref}
            className={cn(buttonVariants({ className, size, variant }))}
            disabled={disabled}
            onPress={onPress ? handlePress : undefined}
            onTouchEnd={shouldHandleTouchRelease ? handleTouchEnd : undefined}
            role="button"
            style={StyleSheet.flatten([{ borderCurve: 'continuous' }, style])}
            android_ripple={
              shouldHaveRipple
                ? { color: rippleColor, borderless: false }
                : undefined
            }
            onTouchCancel={
              shouldHandleTouchRelease ? handleTouchCancel : undefined
            }
            onTouchStart={
              shouldHandleTouchRelease ? handleTouchStart : undefined
            }
            {...props}
          />
        </View>
      </TextContext.Provider>
    );
  }
);

Button.displayName = 'Button';

export { Button, buttonTextVariants, buttonVariants };
export type { ButtonProps };
