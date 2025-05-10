import { cn } from '@/utilities/cn';
import * as React from 'react';
import { TextInput, TextInputProps } from 'react-native';

const Input = React.forwardRef<
  React.ComponentRef<typeof TextInput>,
  TextInputProps
>(({ className, ...props }, ref) => {
  return (
    <TextInput
      className={cn(
        'native:h-12 native:text-lg native:leading-[1.25] h-10 rounded-md border border-border bg-input px-3 text-base text-foreground file:border-0 file:bg-transparent file:font-medium web:flex web:w-full web:py-2 web:placeholder:text-muted-foreground web:focus-visible:outline-none lg:text-sm',
        props.editable === false && 'opacity-50 web:cursor-not-allowed',
        className
      )}
      ref={ref}
      {...props}
    />
  );
});

Input.displayName = 'Input';

export { Input };
