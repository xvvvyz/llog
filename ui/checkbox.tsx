import { cn } from '@/lib/cn';
import { Button, ButtonProps } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { Check, Plus } from 'phosphor-react-native';
import * as React from 'react';

export const Checkbox = ({
  checked,
  checkedColor,
  className,
  onCheckedChange,
  ...rest
}: ButtonProps & {
  checked: boolean;
  checkedColor?: string;
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
        checked && 'bg-primary web:hover:opacity-90 active:opacity-90',
        className
      )}
      {...rest}
    >
      <Icon
        className={cn(checked && 'text-primary-foreground')}
        icon={checked ? Check : Plus}
        size={20}
      />
    </Button>
  );
};
