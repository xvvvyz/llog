import { cn } from '@/lib/cn';
import { TextContext } from '@/ui/text';
import { View, ViewProps } from 'react-native';

export const Card = ({ children, className, ...props }: ViewProps) => (
  <View
    className={cn(
      'border-border-secondary bg-card w-full rounded-2xl border',
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
