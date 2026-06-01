import { cn } from '@/lib/cn';
import { Button, type ButtonProps } from '@/ui/button';
import { Input } from '@/ui/input';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';
import { View } from 'react-native';

const inputGroupVariants = cva(
  'flex-row overflow-hidden border-border-secondary border-continuous rounded-xl bg-input border items-center',
  {
    defaultVariants: { size: 'default' },
    variants: { size: { default: 'h-11', lg: 'h-12', sm: 'h-10', xs: 'h-8' } },
  }
);

type InputGroupSize = NonNullable<
  VariantProps<typeof inputGroupVariants>['size']
>;

const InputGroupSizeContext = React.createContext<InputGroupSize>('default');

type InputGroupProps = React.ComponentPropsWithoutRef<typeof View> &
  VariantProps<typeof inputGroupVariants> & { className?: string };

export const InputGroup = ({
  className,
  size = 'default',
  ...props
}: InputGroupProps) => (
  <InputGroupSizeContext.Provider value={size ?? 'default'}>
    <View className={cn(inputGroupVariants({ size }), className)} {...props} />
  </InputGroupSizeContext.Provider>
);

export const InputGroupInput = React.forwardRef<
  React.ComponentRef<typeof Input>,
  React.ComponentPropsWithoutRef<typeof Input>
>(({ className, size, ...props }, ref) => {
  const groupSize = React.useContext(InputGroupSizeContext);
  const inputSize = size ?? (groupSize === 'xs' ? 'sm' : groupSize);

  return (
    <Input
      ref={ref}
      size={inputSize}
      className={cn(
        'flex-1 min-w-0 border-0 rounded-none bg-transparent opacity-100',
        className
      )}
      {...props}
    />
  );
});

InputGroupInput.displayName = 'InputGroupInput';

export const InputGroupButton = ({
  className,
  size,
  variant = 'ghost',
  wrapperClassName,
  ...props
}: ButtonProps) => {
  const groupSize = React.useContext(InputGroupSizeContext);

  const buttonSize =
    size ??
    (groupSize === 'xs' ? 'icon-xs' : groupSize === 'sm' ? 'icon-sm' : 'icon');

  return (
    <Button
      className={cn('rounded-none', className)}
      size={buttonSize}
      variant={variant}
      wrapperClassName={cn(
        'shrink-0 rounded-none border-l border-border-secondary',
        wrapperClassName
      )}
      {...props}
    />
  );
};
