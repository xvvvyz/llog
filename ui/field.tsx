import { cn } from '@/lib/cn';
import { Input } from '@/ui/input';
import { Label } from '@/ui/label';
import * as React from 'react';
import { TextInput, View } from 'react-native';

type InputProps = React.ComponentPropsWithoutRef<typeof Input>;

type FieldProps = Omit<InputProps, 'accessibilityLabelledBy' | 'id'> & {
  id?: string;
  label: React.ReactNode;
  labelClassName?: string;
  labelRowClassName?: string;
  rightLabelAccessory?: React.ReactNode;
  wrapperClassName?: string;
};

const setRef = (
  ref: React.ForwardedRef<React.ComponentRef<typeof TextInput>>,
  value: React.ComponentRef<typeof TextInput> | null
) => {
  if (typeof ref === 'function') {
    ref(value);
    return;
  }

  if (ref) ref.current = value;
};

export const Field = React.forwardRef<
  React.ComponentRef<typeof TextInput>,
  FieldProps
>(
  (
    {
      id,
      label,
      labelClassName,
      labelRowClassName,
      rightLabelAccessory,
      wrapperClassName,
      ...inputProps
    },
    ref
  ) => {
    const generatedId = React.useId().replace(/:/g, '');
    const inputId = id ?? `field-${generatedId}`;
    const labelId = `${inputId}-label`;
    const inputRef = React.useRef<React.ComponentRef<typeof TextInput>>(null);

    const handleRef = React.useCallback(
      (node: React.ComponentRef<typeof TextInput> | null) => {
        inputRef.current = node;
        setRef(ref, node);
      },
      [ref]
    );

    const labelElement = (
      <Label
        className={labelClassName}
        nativeID={labelId}
        onPress={() => inputRef.current?.focus()}
      >
        {label}
      </Label>
    );

    // Avoid htmlFor here: @rn-primitives/label changes its web render path
    // when htmlFor is present, which shifts the existing label/input spacing.
    const content = (
      <>
        {rightLabelAccessory ? (
          <View
            className={cn(
              'flex-row items-baseline justify-between',
              labelRowClassName
            )}
          >
            {labelElement}
            {rightLabelAccessory}
          </View>
        ) : (
          labelElement
        )}
        <Input
          ref={handleRef}
          accessibilityLabelledBy={labelId}
          id={inputId}
          {...inputProps}
        />
      </>
    );

    if (wrapperClassName) {
      return <View className={wrapperClassName}>{content}</View>;
    }

    return content;
  }
);

Field.displayName = 'Field';
