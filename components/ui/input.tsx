import { cn } from '@/utilities/cn';
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { cva, type VariantProps } from 'class-variance-authority';
import { ComponentPropsWithoutRef, ComponentRef, forwardRef } from 'react';
import { Platform, TextInput } from 'react-native';

const inputVariants = cva(
  'native:leading-5 text-base ios:overflow-hidden native:placeholder:text-placeholder rounded-xl bg-input text-foreground file:border-0 file:bg-transparent file:font-medium web:w-full web:placeholder:text-placeholder web:focus-visible:outline-none',
  {
    defaultVariants: {
      size: 'default',
    },
    variants: {
      size: {
        default: 'h-11 px-4',
        lg: 'h-12 px-5',
        sm: 'h-10 px-3',
      },
    },
  }
);

const Input = forwardRef<
  ComponentRef<typeof BottomSheetTextInput>,
  ComponentPropsWithoutRef<typeof BottomSheetTextInput> &
    VariantProps<typeof inputVariants> & {
      bottomSheet?: boolean;
    }
>(({ className, bottomSheet, size, ...props }, ref) => {
  const Component = bottomSheet ? BottomSheetTextInput : TextInput;

  const content = (
    <Component
      className={cn(
        inputVariants({ size }),
        props.editable === false && 'opacity-50 web:cursor-not-allowed',
        className
      )}
      lineBreakModeIOS="clip"
      ref={ref}
      style={{ borderCurve: 'continuous' }}
      {...props}
    />
  );

  return Platform.select({
    default: content,
    web: <form onSubmit={(e) => e.preventDefault()}>{content}</form>,
  });
});

Input.displayName = 'Input';

export { Input, inputVariants };
