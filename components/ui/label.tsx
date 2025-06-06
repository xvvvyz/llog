import { cn } from '@/utilities/ui/utils';
import * as LabelPrimitive from '@rn-primitives/label';
import { forwardRef } from 'react';

const Label = forwardRef<LabelPrimitive.TextRef, LabelPrimitive.TextProps>(
  (
    { className, onPress, onLongPress, onPressIn, onPressOut, ...props },
    ref
  ) => (
    <LabelPrimitive.Root
      className="web:cursor-default"
      onLongPress={onLongPress}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
    >
      <LabelPrimitive.Text
        ref={ref}
        className={cn(
          'px-2 pb-1.5 text-base leading-tight text-muted-foreground web:peer-disabled:cursor-not-allowed web:peer-disabled:opacity-70',
          className
        )}
        {...props}
      />
    </LabelPrimitive.Root>
  )
);

Label.displayName = LabelPrimitive.Root.displayName;

export { Label };
