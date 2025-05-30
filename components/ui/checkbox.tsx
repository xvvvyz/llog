import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/utilities/cn';
import { Check, Plus } from 'lucide-react-native';
import { startTransition, useCallback, useEffect, useState } from 'react';

export const Checkbox = ({
  checked,
  className,
  onCheckedChange,
}: {
  checked: boolean;
  className?: string;
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
      className={cn('size-10', opChecked && 'bg-primary', className)}
      onPress={handleChange}
      role="checkbox"
      size="icon"
      variant="secondary"
    >
      <Icon
        className={cn(opChecked && 'text-primary-foreground')}
        icon={opChecked ? Check : Plus}
        size={20}
      />
    </Button>
  );
};
