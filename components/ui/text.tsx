import { cn } from '@/utilities/cn';
import { Text as SlotText } from '@rn-primitives/slot';
import { type SlottableTextProps, type TextRef } from '@rn-primitives/types';
import { createContext, forwardRef, useContext } from 'react';
import { Text as TextPrimitive } from 'react-native';

const TextContext = createContext<string | undefined>(undefined);

const Text = forwardRef<TextRef, SlottableTextProps>(
  ({ className, asChild = false, ...props }, ref) => {
    const textClass = useContext(TextContext);
    const Component = asChild ? SlotText : TextPrimitive;

    return (
      <Component
        className={cn(
          'select-none text-base text-foreground',
          textClass,
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);

Text.displayName = 'Text';

export { Text, TextContext };
