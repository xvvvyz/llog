import { useColorScheme } from '@/hooks/use-color-scheme';
import { UI } from '@/theme/ui';
import * as React from 'react';
import { ActivityIndicator, type ActivityIndicatorProps } from 'react-native';

export const Spinner = ({ color, ...props }: ActivityIndicatorProps) => {
  const colorScheme = useColorScheme();

  return (
    <ActivityIndicator color={color ?? UI[colorScheme].foreground} {...props} />
  );
};
