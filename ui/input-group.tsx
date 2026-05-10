import { cn } from '@/lib/cn';
import { Button, type ButtonProps } from '@/ui/button';
import { Input } from '@/ui/input';
import * as React from 'react';
import { View } from 'react-native';

type InputGroupProps = React.ComponentPropsWithoutRef<typeof View> & {
  className?: string;
};

export const InputGroup = ({ className, ...props }: InputGroupProps) => (
  <View
    className={cn(
      'flex-row overflow-hidden border-border-secondary border-continuous rounded-xl bg-input border items-center',
      className
    )}
    {...props}
  />
);

export const InputGroupInput = React.forwardRef<
  React.ComponentRef<typeof Input>,
  React.ComponentPropsWithoutRef<typeof Input>
>(({ className, size = 'sm', ...props }, ref) => (
  <Input
    ref={ref}
    size={size}
    className={cn(
      'flex-1 min-w-0 border-0 rounded-none bg-transparent opacity-100',
      className
    )}
    {...props}
  />
));

InputGroupInput.displayName = 'InputGroupInput';

export const InputGroupButton = ({
  className,
  size = 'icon',
  variant = 'ghost',
  wrapperClassName,
  ...props
}: ButtonProps) => (
  <Button
    className={cn('rounded-none', className)}
    size={size}
    variant={variant}
    wrapperClassName={cn(
      'shrink-0 rounded-none border-l border-border-secondary',
      wrapperClassName
    )}
    {...props}
  />
);
