import { cn } from '@/lib/cn';
import { Button, type ButtonProps } from '@/ui/button';
import * as React from 'react';
import { View } from 'react-native';

type ButtonGroupProps = React.ComponentPropsWithoutRef<typeof View> & {
  className?: string;
};

export const ButtonGroup = ({ className, ...props }: ButtonGroupProps) => (
  <View
    className={cn(
      'h-8 flex-row overflow-hidden border-border-secondary border-continuous rounded-lg bg-secondary border items-stretch',
      className
    )}
    {...props}
  />
);

export const ButtonGroupButton = ({
  className,
  showSeparator,
  size = 'icon-xs',
  variant = 'ghost',
  wrapperClassName,
  ...props
}: ButtonProps & { showSeparator?: boolean }) => (
  <Button
    className={cn('h-full w-8 rounded-none', className)}
    size={size}
    variant={variant}
    wrapperClassName={cn(
      'h-full shrink-0 rounded-none border-continuous',
      showSeparator && 'border-l border-border-secondary',
      wrapperClassName
    )}
    {...props}
  />
);
