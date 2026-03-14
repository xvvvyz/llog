import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { cn } from '@/utilities/cn';
import * as RadioGroupPrimitive from '@rn-primitives/radio-group';
import { Check } from 'phosphor-react-native';
import { createContext, useContext } from 'react';
import { View } from 'react-native';

const ValueContext = createContext<string | undefined>(undefined);

export const Root = ({
  children,
  ...props
}: RadioGroupPrimitive.RootProps & { children: React.ReactNode }) => (
  <RadioGroupPrimitive.Root {...props}>
    <ValueContext.Provider value={props.value}>
      {children}
    </ValueContext.Provider>
  </RadioGroupPrimitive.Root>
);

export const Item = ({
  className,
  description,
  label,
  value,
}: {
  className?: string;
  description?: string;
  label: string;
  value: string;
}) => {
  const selected = useContext(ValueContext) === value;

  return (
    <RadioGroupPrimitive.Item
      className={cn(
        'rounded-xl border border-border px-4 py-2.5',
        selected && 'border-primary bg-primary/10',
        className
      )}
      value={value}
    >
      <View className="flex-row items-center justify-between">
        <View className="gap-0.5">
          <Text
            className={cn(
              'text-sm font-medium leading-tight',
              selected && 'text-primary'
            )}
          >
            {label}
          </Text>
          {description && (
            <Text
              className={cn(
                'text-xs text-placeholder',
                selected && 'text-primary'
              )}
            >
              {description}
            </Text>
          )}
        </View>
        {selected && <Icon className="text-primary" icon={Check} />}
      </View>
    </RadioGroupPrimitive.Item>
  );
};
