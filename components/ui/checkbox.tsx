import { Button, ButtonProps } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/utilities/ui/utils';
import { Check, Plus } from 'lucide-react-native';
import { startTransition, useCallback, useEffect, useState } from 'react';

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
  const [opChecked, setOpChecked] = useState(checked);
  useEffect(() => setOpChecked(checked), [checked]);

  const handleChange = useCallback(() => {
    setOpChecked(!checked);
    startTransition(() => onCheckedChange(!checked));
  }, [onCheckedChange, checked]);

  return (
    <Button
      aria-checked={opChecked}
      className={cn(opChecked && 'bg-primary', className)}
      onPress={handleChange}
      role="checkbox"
      size="icon"
      style={{ backgroundColor: opChecked ? checkedColor : undefined }}
      variant="secondary"
      {...rest}
    >
      <Icon
        className={cn(opChecked && 'text-primary-foreground')}
        icon={opChecked ? Check : Plus}
        size={20}
      />
    </Button>
  );
};
