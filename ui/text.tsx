import { cn } from '@/lib/cn';
import { Text as SlotText } from '@rn-primitives/slot';
import { type SlottableTextProps, type TextRef } from '@rn-primitives/types';
import * as React from 'react';
import { Text as TextPrimitive } from 'react-native';

const TextContext = React.createContext<string | undefined>(undefined);

const Text = React.forwardRef<TextRef, SlottableTextProps>(
  ({ className, asChild = false, ...props }, ref) => {
    const textClass = React.useContext(TextContext);
    const Component = asChild ? SlotText : TextPrimitive;

    return (
      <Component
        ref={ref}
        className={cn(
          'text-foreground text-base select-none',
          textClass,
          className
        )}
        {...props}
      />
    );
  }
);

Text.displayName = 'Text';

export { Text, TextContext };
