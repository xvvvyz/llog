import { cn } from '@/lib/cn';
import { TextContext } from '@/ui/text';
import { View, ViewProps } from 'react-native';

export const Card = ({ children, className, ...props }: ViewProps) => (
  <View
    style={{ borderCurve: 'continuous' }}
    className={cn(
      'border-border-secondary bg-card w-full rounded-2xl border',
      className
    )}
    {...props}
  >
    <TextContext.Provider value="text-card-foreground">
      {children}
    </TextContext.Provider>
  </View>
);
