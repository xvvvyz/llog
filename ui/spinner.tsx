import { useColorScheme } from '@/hooks/use-color-scheme';
import { cn } from '@/lib/cn';
import { UI } from '@/theme/ui';
import { cva } from 'class-variance-authority';
import * as React from 'react';

import {
  ActivityIndicator,
  type ActivityIndicatorProps,
  type StyleProp,
  View,
  type ViewStyle,
} from 'react-native';

const spinnerVariants = cva('shrink-0 items-center justify-center', {
  defaultVariants: { size: 'sm' },
  variants: { size: { sm: 'h-5 w-5', xs: 'h-5 w-5' } },
});

const spinnerIndicatorSizes = { sm: 20, xs: 16 } as const;
type SpinnerVariantSize = keyof typeof spinnerIndicatorSizes;

type SpinnerProps = Omit<ActivityIndicatorProps, 'size' | 'style'> & {
  className?: string;
  size?: SpinnerVariantSize;
  style?: StyleProp<ViewStyle>;
};

export const Spinner = ({
  className,
  color,
  size,
  style,
  ...props
}: SpinnerProps) => {
  const colorScheme = useColorScheme();
  const normalizedSize = size ?? 'sm';

  return (
    <View
      className={cn(spinnerVariants({ size: normalizedSize }), className)}
      style={style}
    >
      <ActivityIndicator
        color={color ?? UI[colorScheme].foreground}
        size={spinnerIndicatorSizes[normalizedSize]}
        {...props}
      />
    </View>
  );
};
