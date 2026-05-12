import { cn } from '@/lib/cn';
import { Button, ButtonProps } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { Check, Plus } from 'phosphor-react-native';
import * as React from 'react';

export const Checkbox = ({
  checked,
  checkedColor,
  className,
  emptyUnchecked = false,
  onCheckedChange,
  wrapperClassName,
  ...rest
}: ButtonProps & {
  checked: boolean;
  checkedColor?: string;
  emptyUnchecked?: boolean;
  onCheckedChange: (checked: boolean) => void;
}) => {
  const handleChange = React.useCallback(() => {
    onCheckedChange(!checked);
  }, [checked, onCheckedChange]);

  return (
    <Button
      aria-checked={checked}
      onPress={handleChange}
      role="checkbox"
      size="icon"
      style={checked && { backgroundColor: checkedColor }}
      variant="secondary"
      className={cn(
        emptyUnchecked && 'rounded-md border-continuous',
        checked && 'bg-primary web:hover:opacity-90 active:opacity-90',
        className
      )}
      wrapperClassName={cn(
        emptyUnchecked && 'rounded-md border-continuous',
        wrapperClassName
      )}
      {...rest}
    >
      {(checked || !emptyUnchecked) && (
        <Icon
          className={cn(checked && 'text-primary-foreground')}
          icon={checked ? Check : Plus}
          size={emptyUnchecked ? 14 : 20}
        />
      )}
    </Button>
  );
};
