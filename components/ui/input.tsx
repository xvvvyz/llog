import { cn } from '@/utilities/cn';
import { forwardRef } from 'react';
import { TextInput, TextInputProps } from 'react-native';

const Input = forwardRef<React.ComponentRef<typeof TextInput>, TextInputProps>(
  ({ className, ...props }, ref) => {
    return (
      <TextInput
        className={cn(
          'native:h-12 native:leading-[1.25] h-12 rounded-xl border border-border bg-input/10 px-4 text-base text-foreground file:border-0 file:bg-transparent file:font-medium placeholder:text-muted-foreground web:flex web:w-full web:py-2 web:focus-visible:outline-none',
          props.editable === false && 'opacity-50 web:cursor-not-allowed',
          className
        )}
        ref={ref}
        style={{ borderCurve: 'continuous' }}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';

export { Input };
