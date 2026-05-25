import { cn } from '@/lib/cn';
import { Button, ButtonProps } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { Check, Plus } from 'phosphor-react-native';
import * as React from 'react';

export const Checkbox = ({
  checked,
  checkedClassName,
  className,
  emptyUnchecked = false,
  onCheckedChange,
  wrapperClassName,
  ...rest
}: ButtonProps & {
  checked: boolean;
  checkedClassName?: string;
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
      variant="secondary"
      className={cn(
        emptyUnchecked && 'rounded-md border-continuous',
        checked && 'web:hover:opacity-90 active:opacity-90',
        checked && (checkedClassName ?? 'bg-primary'),
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
