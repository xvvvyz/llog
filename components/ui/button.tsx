import { TextClassContext } from '@/components/ui/text';
import { useRippleColor } from '@/hooks/use-ripple-color';
import { cn } from '@/utilities/cn';
import { cva, type VariantProps } from 'class-variance-authority';
import { type ComponentRef, forwardRef } from 'react';
import { Pressable, View } from 'react-native';

const buttonWrapperVariants = cva('overflow-hidden rounded-xl', {
  defaultVariants: {
    size: 'default',
  },
  variants: {
    size: {
      default: '',
      icon: '',
      lg: '',
      sm: '',
    },
    variant: {
      default: '',
      destructive: '',
      ghost: '',
      link: '',
      outline: 'border border-input',
      secondary: '',
    },
  },
});

const buttonVariants = cva(
  'group flex-row items-center gap-2 justify-center web:transition-colors web:focus-visible:outline-none',
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
        sm: 'h-10 px-3',
      },
      variant: {
        default: 'bg-primary web:hover:opacity-90 active:opacity-90',
        destructive: 'bg-destructive web:hover:opacity-90 active:opacity-90',
        ghost:
          'web:hover:bg-accent web:hover:text-accent-foreground web:active:bg-accent',
        link: '',
        outline:
          'bg-transparent web:hover:bg-accent web:hover:text-accent-foreground active:bg-accent',
        secondary: 'bg-secondary web:hover:opacity-90 active:opacity-90',
      },
    },
  }
);

const buttonTextVariants = cva(
  'web:whitespace-nowrap font-medium text-foreground web:transition-colors',
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
      },
      variant: {
        default: 'text-primary-foreground',
        destructive: 'text-destructive-foreground',
        ghost: '',
        link: 'text-primary',
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

const Button = forwardRef<ComponentRef<typeof Pressable>, ButtonProps>(
  ({ className, ripple, size, variant, wrapperClassName, ...props }, ref) => {
    const rippleColor = useRippleColor(
      ripple ??
        (variant === 'ghost' || variant === 'outline' || variant === 'secondary'
          ? 'inverse'
          : 'default')
    );

    const shouldHaveRipple = variant !== 'link';

    return (
      <TextClassContext.Provider
        value={buttonTextVariants({
          className: 'web:pointer-events-none',
          size,
          variant,
        })}
      >
        <View
          className={cn(
            buttonWrapperVariants({
              className: wrapperClassName,
              size,
              variant,
            })
          )}
          style={{ borderCurve: 'continuous' }}
        >
          <Pressable
            accessibilityRole="button"
            android_ripple={
              shouldHaveRipple
                ? {
                    color: rippleColor,
                    borderless: false,
                  }
                : undefined
            }
            className={cn(
              props.disabled && 'opacity-50 web:pointer-events-none',
              buttonVariants({ className, size, variant })
            )}
            ref={ref}
            role="button"
            {...props}
          />
        </View>
      </TextClassContext.Provider>
    );
  }
);

Button.displayName = 'Button';

export { Button, buttonTextVariants, buttonVariants };
export type { ButtonProps };
