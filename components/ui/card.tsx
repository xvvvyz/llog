import { TextContext } from '@/components/ui/text';
import { cn } from '@/utilities/cn';
import { View, ViewProps } from 'react-native';

export const Card = ({ children, className, ...props }: ViewProps) => (
  <View
    className={cn(
      'w-full rounded-xl border border-border-secondary bg-card',
      className
    )}
    style={{ borderCurve: 'continuous' }}
    {...props}
  >
    <TextContext.Provider value="text-card-foreground">
      {children}
    </TextContext.Provider>
  </View>
);
