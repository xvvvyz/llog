import { cn } from '@/utilities/ui/utils';
import { View, ViewProps } from 'react-native';
import { TextClassContext } from './text';

export const Card = ({ children, className, ...props }: ViewProps) => (
  <View
    className={cn(
      'w-full rounded-xl border border-border-secondary bg-card p-4',
      className
    )}
    style={{ borderCurve: 'continuous' }}
    {...props}
  >
    <TextClassContext.Provider value="text-card-foreground">
      {children}
    </TextClassContext.Provider>
  </View>
);
