import { TextContext } from '@/components/ui/text';
import { useRippleColor } from '@/hooks/use-ripple-color';
import { cn } from '@/utilities/cn';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';
import { Pressable, View } from 'react-native';

const buttonWrapperVariants = cva('overflow-hidden rounded-xl', {
  defaultVariants: {
    size: 'default',
    variant: 'default',
  },
  variants: {
    size: {
      default: '',
      icon: '',
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
  'group flex-row items-center rounded-xl gap-3 justify-center web:transition-opacity web:transition-colors web:focus-visible:outline-none',
  {
    defaultVariants: {
      size: 'default',
      variant: 'default',
    },
    variants: {
      size: {
        default: 'h-11 px-4 py-2',
        icon: 'h-11 w-11',
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
    defaultVariants: {
      size: 'default',
      variant: 'default',
    },
    variants: {
      size: {
        default: '',
        icon: '',
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
    ripple?: 'default' | 'inverse';
    wrapperClassName?: string;
  };

const Button = React.forwardRef<
  React.ComponentRef<typeof Pressable>,
  ButtonProps
>(
  (
    { className, disabled, ripple, size, variant, wrapperClassName, ...props },
    ref
  ) => {
    const rippleColor = useRippleColor(
      ripple ??
        (variant === 'ghost' || variant === 'outline' || variant === 'secondary'
          ? 'inverse'
          : 'default')
    );

    const shouldHaveRipple = variant !== 'link';

    return (
      <TextContext.Provider
        value={buttonTextVariants({
          className: 'web:pointer-events-none',
          size,
          variant,
        })}
      >
        <View
          className={cn(
            buttonWrapperVariants({ size, variant }),
            disabled && 'opacity-50',
            wrapperClassName
          )}
          style={{ borderCurve: 'continuous' }}
        >
          <Pressable
            android_ripple={
              shouldHaveRipple
                ? {
                    color: rippleColor,
                    borderless: false,
                  }
                : undefined
            }
            className={cn(buttonVariants({ className, size, variant }))}
            disabled={disabled}
            ref={ref}
            role="button"
            style={{ borderCurve: 'continuous' }}
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
