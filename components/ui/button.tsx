import { TextClassContext } from '@/components/ui/text';
import { cn } from '@/utilities/cn';
import { cva, type VariantProps } from 'class-variance-authority';
import { type ComponentRef, forwardRef } from 'react';
import { Pressable } from 'react-native';

const buttonVariants = cva(
  'group flex-row items-center gap-2 justify-center rounded-xl web:transition-colors web:focus-visible:outline-none',
  {
    defaultVariants: {
      size: 'default',
      variant: 'default',
    },
    variants: {
      size: {
        default: 'h-12 px-4 py-2',
        icon: 'h-10 w-10',
        lg: 'h-13 px-8',
        sm: 'h-10 rounded-md px-3',
      },
      variant: {
        default: 'bg-primary web:hover:opacity-90 active:opacity-90',
        destructive: 'bg-destructive web:hover:opacity-90 active:opacity-90',
        ghost:
          'web:hover:bg-accent web:hover:text-accent-foreground active:bg-accent',
        link: 'web:underline-offset-4 web:hover:underline web:focus:underline',
        outline:
          'border border-input bg-transparent web:hover:bg-accent web:hover:text-accent-foreground active:bg-accent',
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
        ghost: 'group-active:text-accent-foreground',
        link: 'text-primary group-active:underline',
        outline: 'group-active:text-accent-foreground',
        secondary:
          'text-secondary-foreground group-active:text-secondary-foreground',
      },
    },
  }
);

type ButtonProps = React.ComponentPropsWithoutRef<typeof Pressable> &
  VariantProps<typeof buttonVariants>;

const Button = forwardRef<ComponentRef<typeof Pressable>, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <TextClassContext.Provider
        value={buttonTextVariants({
          className: 'web:pointer-events-none',
          size,
          variant,
        })}
      >
        <Pressable
          className={cn(
            props.disabled && 'opacity-50 web:pointer-events-none',
            buttonVariants({ className, size, variant })
          )}
          ref={ref}
          role="button"
          style={{ borderCurve: 'continuous' }}
          {...props}
        />
      </TextClassContext.Provider>
    );
  }
);

Button.displayName = 'Button';

export { Button, buttonTextVariants, buttonVariants };
export type { ButtonProps };
