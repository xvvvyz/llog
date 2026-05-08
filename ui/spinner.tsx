import { useColorScheme } from '@/hooks/use-color-scheme';
import { cn } from '@/lib/cn';
import { UI } from '@/theme/ui';
import { TextContext } from '@/ui/text';
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
type ThemeColors = (typeof UI)[keyof typeof UI];

type SpinnerProps = Omit<ActivityIndicatorProps, 'size' | 'style'> & {
  className?: string;
  size?: SpinnerVariantSize;
  style?: StyleProp<ViewStyle>;
};

const getSpinnerContextColor = (
  textClass: string | undefined,
  colors: ThemeColors
) => {
  if (!textClass) return;

  if (textClass.includes('text-primary-foreground')) {
    return colors.primaryForeground;
  }

  if (textClass.includes('text-destructive-foreground')) {
    return colors.destructiveForeground;
  }

  if (textClass.includes('text-secondary-foreground')) {
    return colors.secondaryForeground;
  }

  if (textClass.includes('text-muted-foreground')) {
    return colors.mutedForeground;
  }

  if (textClass.includes('text-popover-foreground')) {
    return colors.popoverForeground;
  }

  if (textClass.includes('text-placeholder')) return colors.placeholder;
  if (textClass.includes('text-destructive')) return colors.destructive;
  if (textClass.includes('text-foreground')) return colors.foreground;
};

export const Spinner = ({
  className,
  color,
  size,
  style,
  ...props
}: SpinnerProps) => {
  const colorScheme = useColorScheme();
  const textClass = React.useContext(TextContext);
  const normalizedSize = size ?? 'sm';
  const colors = UI[colorScheme];

  return (
    <View
      className={cn(spinnerVariants({ size: normalizedSize }), className)}
      style={style}
    >
      <ActivityIndicator
        size={spinnerIndicatorSizes[normalizedSize]}
        color={
          color ??
          getSpinnerContextColor(textClass, colors) ??
          colors.foreground
        }
        {...props}
      />
    </View>
  );
};
