import { cn } from '@/lib/cn';
import * as SwitchPrimitive from '@rn-primitives/switch';
import * as React from 'react';

export const Switch = React.forwardRef<
  React.ComponentRef<typeof SwitchPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>
>(({ checked, className, disabled, ...props }, ref) => (
  <SwitchPrimitive.Root
    ref={ref}
    checked={checked}
    disabled={disabled}
    className={cn(
      'border-border-secondary web:transition-colors h-7 w-12 justify-center rounded-full border px-0.5',
      checked ? 'border-primary bg-primary' : 'bg-input',
      disabled && 'opacity-50',
      className
    )}
    {...props}
  >
    <SwitchPrimitive.Thumb
      className={cn(
        'bg-background web:transition-transform size-5 rounded-full shadow-xs',
        checked ? 'translate-x-5' : 'translate-x-0'
      )}
    />
  </SwitchPrimitive.Root>
));

Switch.displayName = 'Switch';
