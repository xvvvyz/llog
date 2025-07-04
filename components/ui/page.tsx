import { cn } from '@/utilities/cn';
import { View, ViewProps } from 'react-native';

export const Page = ({ className, ...props }: ViewProps) => (
  <View className={cn('flex-1 bg-background', className)} {...props} />
);
