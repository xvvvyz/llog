import { cn } from '@/utilities/cn';
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { cva, type VariantProps } from 'class-variance-authority';
import { TextInput } from 'react-native';

import {
  ComponentPropsWithoutRef,
  ComponentRef,
  forwardRef,
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

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
>(
  (
    {
      className,
      bottomSheet,
      size,
      value,
      onChangeText,
      defaultValue,
      ...props
    },
    ref
  ) => {
    const [localValue, setLocalValue] = useState(value ?? defaultValue ?? '');

    useEffect(() => {
      if (value !== undefined) setLocalValue(value);
    }, [value]);

    const handleChangeText = useCallback(
      (text: string) => {
        setLocalValue(text);
        if (onChangeText) startTransition(() => onChangeText(text));
      },
      [onChangeText]
    );

    const inputProps = useMemo(
      () => ({
        className: cn(
          inputVariants({ size }),
          props.editable === false && 'opacity-50 web:cursor-not-allowed',
          className
        ),
        lineBreakModeIOS: 'clip' as const,
        onChangeText: handleChangeText,
        ref,
        style: { borderCurve: 'continuous' as const },
        value: localValue,
        ...props,
      }),
      [className, handleChangeText, localValue, props, ref, size]
    );

    const Input = useMemo(
      () => (bottomSheet ? BottomSheetTextInput : TextInput),
      [bottomSheet]
    );

    return <Input {...inputProps} />;
  }
);

Input.displayName = 'Input';

export { Input, inputVariants };
