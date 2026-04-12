import { Button, ButtonProps } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/utilities/cn';
import { Check } from 'phosphor-react-native/lib/module/icons/Check';
import { Plus } from 'phosphor-react-native/lib/module/icons/Plus';
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
      className={cn(checked && 'bg-primary', className)}
      onPress={handleChange}
      role="checkbox"
      size="icon"
      style={{ backgroundColor: checked ? checkedColor : undefined }}
      variant="secondary"
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
