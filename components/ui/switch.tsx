import { cn } from '@/utilities/cn';
import * as SwitchPrimitive from '@rn-primitives/switch';
import * as React from 'react';

export const Switch = React.forwardRef<
  React.ComponentRef<typeof SwitchPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>
>(({ checked, className, disabled, ...props }, ref) => (
  <SwitchPrimitive.Root
    checked={checked}
    className={cn(
      'h-7 w-12 justify-center rounded-full border border-border-secondary px-0.5 web:transition-colors',
      checked ? 'border-primary bg-primary' : 'bg-input',
      disabled && 'opacity-50',
      className
    )}
    disabled={disabled}
    ref={ref}
    {...props}
  >
    <SwitchPrimitive.Thumb
      className={cn(
        'size-5 rounded-full bg-background shadow-sm web:transition-transform',
        checked ? 'translate-x-5' : 'translate-x-0'
      )}
    />
  </SwitchPrimitive.Root>
));

Switch.displayName = 'Switch';
