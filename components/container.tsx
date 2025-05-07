import { cn } from '@/lib/utils';
import { View } from 'react-native';

interface ContainerProps {
  children?: React.ReactNode;
  className?: string;
}

export function Container({ children, className }: ContainerProps) {
  return (
    <View className={cn('flex-1 bg-background p-6', className)}>
      {children}
    </View>
  );
}
