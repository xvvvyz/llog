import { cn } from '@/utilities/cn';
import { View, ViewProps } from 'react-native';

export const Page = ({ className, ...props }: ViewProps) => (
  <View className={cn('bg-background relative flex-1', className)} {...props} />
);
